import Tesseract from 'tesseract.js';

/**
 * Charge une image en respectant l'orientation EXIF ('from-image'),
 * applique un scaling x2 si la dimension max est < 1500px,
 * et réalise un prétraitement (niveaux de gris + contraste ×1.4).
 */
export async function loadAndPrepareImage(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });

  // 1. Upscale vers ~2400 px si largeur < 2400 px
  const targetWidth = 2400;
  const scale = bitmap.width < targetWidth ? targetWidth / bitmap.width : 1;

  const padding = 20; // 20px de padding blanc autour
  const scaledWidth = Math.round(bitmap.width * scale);
  const scaledHeight = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = scaledWidth + padding * 2;
  canvas.height = scaledHeight + padding * 2;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Impossible d\'obtenir le contexte 2D du canvas.');
  }

  // Fond blanc pur
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Redimensionnement haute qualité (smoothing)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.drawImage(bitmap, padding, padding, scaledWidth, scaledHeight);

  // Prétraitement pixel par pixel (Niveaux de gris + augmentation de contraste x1.4)
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    gray = (gray - 128) * 1.4 + 128;
    gray = Math.max(0, Math.min(255, gray));

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Retourne un canvas pivoté (0°, 90°, 180°, 270°).
 * Permute la largeur et la hauteur pour 90° et 270°.
 */
export function rotatedCanvas(
  source: HTMLCanvasElement,
  degrees: 0 | 90 | 180 | 270
): HTMLCanvasElement {
  if (degrees === 0) return source;

  const canvas = document.createElement('canvas');
  if (degrees === 90 || degrees === 270) {
    canvas.width = source.height;
    canvas.height = source.width;
  } else {
    canvas.width = source.width;
    canvas.height = source.height;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return source;

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((degrees * Math.PI) / 180);
  ctx.drawImage(source, -source.width / 2, -source.height / 2);

  return canvas;
}

/**
 * Calcule le score de pertinence d'un texte OCR en fonction de la présence
 * de mots-clés d'emploi du temps ou de maquette académique et du niveau de confiance.
 */
export function scoreText(text: string, confidence: number = 0): number {
  if (!text || typeof text !== 'string') return 0;

  const daysMatches = text.match(/lundi|marti|mardi|mercredi|jeudi|vendredi|samedi|dimanche/gi) || [];
  const timeMatches = text.match(/\b\d{1,2}[h:]\d{2}\b/gi) || [];
  const roomMatches = text.match(/salle|amphi|campus/gi) || [];
  const typeMatches = text.match(/\b(cm|td|tp)\b/gi) || [];
  const structMatches = text.match(/ue|ecue|ects|semestre|matière|intitulé/gi) || [];

  const keywordCount =
    daysMatches.length +
    timeMatches.length +
    roomMatches.length +
    typeMatches.length +
    structMatches.length;

  return keywordCount + confidence / 10;
}

/**
 * Exécute un traitement OCR multi-orientations (0°, 90°, 270°, 180°)
 * et retourne le meilleur texte extrait.
 */
export async function processMultiOrientationOCR(
  file: File,
  onProgress?: (message: string, progressPercent: number) => void
): Promise<string> {
  onProgress?.('Préparation et optimisation de l\'image...', 5);
  const preparedCanvas = await loadAndPrepareImage(file);

  if (preparedCanvas.width < 40 || preparedCanvas.height < 40) {
    console.warn('[ocrImage] Image trop petite (< 40px), passage d\'OCR annulé.');
    return '';
  }

  onProgress?.('Analyse OCR à 0°...', 15);
  const res0 = await Tesseract.recognize(rotatedCanvas(preparedCanvas, 0), 'fra+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        onProgress?.('Analyse OCR à 0°...', Math.round(15 + m.progress * 25));
      }
    },
  });

  const text0 = res0.data.text || '';
  const conf0 = res0.data.confidence || 0;
  const score0 = scoreText(text0, conf0);

  if (score0 >= 3) {
    onProgress?.('Extraction réussie (0°)', 100);
    return text0;
  }

  let bestText = text0;
  let bestScore = score0;

  const angles: (90 | 270 | 180)[] = [90, 270, 180];
  const stepPercents = [50, 75, 90];

  for (let i = 0; i < angles.length; i++) {
    const deg = angles[i];
    const basePct = stepPercents[i];
    onProgress?.(`Détection de l'orientation... ${deg}°`, basePct);

    const canvasRotated = rotatedCanvas(preparedCanvas, deg);
    const res = await Tesseract.recognize(canvasRotated, 'fra+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && m.progress) {
          onProgress?.(`Détection de l'orientation... ${deg}°`, Math.min(99, Math.round(basePct + m.progress * 15)));
        }
      },
    });

    const text = res.data.text || '';
    const conf = res.data.confidence || 0;
    const score = scoreText(text, conf);

    if (score > bestScore) {
      bestScore = score;
      bestText = text;
    }
  }

  onProgress?.('Extraction multi-orientations terminée !', 100);
  return bestText;
}
