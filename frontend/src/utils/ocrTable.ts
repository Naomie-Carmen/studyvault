import Tesseract from 'tesseract.js';
import { loadAndPrepareImage } from './ocrImage';

interface WordItem {
  text: string;
  confidence: number;
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

export interface DetectedGrid {
  horizontalLines: number[];
  verticalLines: number[];
}

/**
 * Détecte la grille (traits horizontaux et verticaux noirs/sombres) sur le canvas d'une maquette.
 * Retourne les coordonnées des frontières horizontales et verticales, ou null si aucune grille explicite.
 */
export function detectGrid(canvas: HTMLCanvasElement): DetectedGrid | null {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx || width === 0 || height === 0) return null;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Frontières HORIZONTALES : pour chaque y, ratio de pixels sombres sur la largeur
  const darkYCandidates: boolean[] = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    let darkCount = 0;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128) {
        darkCount++;
      }
    }
    if (darkCount / width > 0.5) {
      darkYCandidates[y] = true;
    }
  }

  // Regrouper les y consécutifs (±3 px) en une frontière unique
  const horizontalLines: number[] = [];
  let tempGroup: number[] = [];

  for (let y = 0; y < height; y++) {
    if (darkYCandidates[y]) {
      tempGroup.push(y);
    } else {
      if (tempGroup.length > 0) {
        const avgY = Math.round(tempGroup.reduce((a, b) => a + b, 0) / tempGroup.length);
        horizontalLines.push(avgY);
        tempGroup = [];
      }
    }
  }
  if (tempGroup.length > 0) {
    const avgY = Math.round(tempGroup.reduce((a, b) => a + b, 0) / tempGroup.length);
    horizontalLines.push(avgY);
  }

  if (horizontalLines.length < 3) return null;

  // 2. Frontières VERTICALES : calculées entre la première et la dernière frontière horizontale
  const minY = horizontalLines[0];
  const maxY = horizontalLines[horizontalLines.length - 1];
  const spanY = Math.max(1, maxY - minY);

  const darkXCandidates: boolean[] = new Array(width).fill(false);
  for (let x = 0; x < width; x++) {
    let darkCount = 0;
    for (let y = minY; y <= maxY; y++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      if (luminance < 128) {
        darkCount++;
      }
    }
    if (darkCount / spanY > 0.5) {
      darkXCandidates[x] = true;
    }
  }

  // Regrouper les x consécutifs (±3 px) en une frontière unique
  const verticalLines: number[] = [];
  let tempXGroup: number[] = [];

  for (let x = 0; x < width; x++) {
    if (darkXCandidates[x]) {
      tempXGroup.push(x);
    } else {
      if (tempXGroup.length > 0) {
        const avgX = Math.round(tempXGroup.reduce((a, b) => a + b, 0) / tempXGroup.length);
        verticalLines.push(avgX);
        tempXGroup = [];
      }
    }
  }
  if (tempXGroup.length > 0) {
    const avgX = Math.round(tempXGroup.reduce((a, b) => a + b, 0) / tempXGroup.length);
    verticalLines.push(avgX);
  }

  if (verticalLines.length < 3) return null;

  return { horizontalLines, verticalLines };
}

/**
 * Reconstruit la structure 2D (tableau 2D string[][]) d'une image de maquette.
 * Utilise en priorité la détection de grille (bordures sombres).
 * Si aucune grille n'est trouvée, utilise le clustering par bounding boxes.
 */
export async function extractTableFromImage(
  file: File,
  onProgress?: (message: string, progressPercent: number) => void
): Promise<string[][]> {
  onProgress?.('Préparation et optimisation de l\'image...', 10);
  const canvas = await loadAndPrepareImage(file);

  onProgress?.('Analyse de la grille et extraction OCR...', 30);
  const res = await Tesseract.recognize(canvas, 'fra+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        onProgress?.('Reconnaissance des mots et coordonnées...', Math.round(30 + m.progress * 50));
      }
    },
  });

  const rawText = res.data.text || '';
  const wordsRaw = (res.data as any).words as WordItem[] | undefined;

  // Fallback si aucun mot utilisable
  if (!wordsRaw || !Array.isArray(wordsRaw) || wordsRaw.length === 0) {
    onProgress?.('Utilisation du fallback texte brut...', 90);
    return cleanSemanticRows(fallbackRawTextToRows(rawText));
  }

  // Filtrage : confiance > 30 et texte non vide
  const words = wordsRaw.filter(
    (w) => w.confidence > 30 && w.text && w.text.trim().length > 0
  );

  if (words.length === 0) {
    return cleanSemanticRows(fallbackRawTextToRows(rawText));
  }

  // Tentative de détection de la grille binaire
  onProgress?.('Détection de la grille du tableau...', 85);
  const grid = detectGrid(canvas);

  let rawRows: string[][] = [];

  if (grid) {
    // -------------------------------------------------------------
    // OPTION A : Extraction basée sur la grille détectée
    // -------------------------------------------------------------
    const numRows = grid.horizontalLines.length - 1;
    const numCols = grid.verticalLines.length - 1;

    const gridMatrix: WordItem[][][] = Array.from({ length: numRows }, () =>
      Array.from({ length: numCols }, () => [])
    );

    for (const word of words) {
      const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
      const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

      let r = -1;
      for (let i = 0; i < numRows; i++) {
        if (centerY >= grid.horizontalLines[i] && centerY < grid.horizontalLines[i + 1]) {
          r = i;
          break;
        }
      }

      let c = -1;
      for (let j = 0; j < numCols; j++) {
        if (centerX >= grid.verticalLines[j] && centerX < grid.verticalLines[j + 1]) {
          c = j;
          break;
        }
      }

      if (r >= 0 && c >= 0) {
        gridMatrix[r][c].push(word);
      }
    }

    for (let r = 0; r < numRows; r++) {
      const rowCells: string[] = [];
      for (let c = 0; c < numCols; c++) {
        const cellWords = gridMatrix[r][c];
        cellWords.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        const cellText = cellWords.map((w) => w.text.trim()).join(' ');
        rowCells.push(cellText);
      }
      if (rowCells.some((cell) => cell.length > 0)) {
        rawRows.push(rowCells);
      }
    }
  } else {
    // -------------------------------------------------------------
    // OPTION B (Fallback) : Clustering par Bounding Boxes
    // -------------------------------------------------------------
    const heights = words.map((w) => Math.abs(w.bbox.y1 - w.bbox.y0)).sort((a, b) => a - b);
    const medianHeight = heights[Math.floor(heights.length / 2)] || 20;

    words.sort((a, b) => a.bbox.y0 - b.bbox.y0);

    interface LineBucket {
      words: WordItem[];
      minY: number;
      maxY: number;
    }
    const lines: LineBucket[] = [];

    for (const word of words) {
      const wMinY = word.bbox.y0;
      const wMaxY = word.bbox.y1;

      let added = false;
      if (lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        if (wMinY <= lastLine.maxY - 0.4 * medianHeight) {
          lastLine.words.push(word);
          lastLine.minY = Math.min(lastLine.minY, wMinY);
          lastLine.maxY = Math.max(lastLine.maxY, wMaxY);
          added = true;
        }
      }

      if (!added) {
        lines.push({
          words: [word],
          minY: wMinY,
          maxY: wMaxY,
        });
      }
    }

    for (const line of lines) {
      line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);

      const lineHeights = line.words.map((w) => Math.abs(w.bbox.y1 - w.bbox.y0)).sort((a, b) => a - b);
      const lineMedianHeight = lineHeights[Math.floor(lineHeights.length / 2)] || medianHeight;
      const gapThreshold = Math.max(12, 0.5 * lineMedianHeight);

      const rowCells: string[] = [];
      let currentCellWords: string[] = [];
      let prevX1 = -1;

      for (const word of line.words) {
        const wordText = word.text.trim();
        if (prevX1 !== -1 && word.bbox.x0 - prevX1 > gapThreshold) {
          rowCells.push(currentCellWords.join(' '));
          currentCellWords = [wordText];
        } else {
          currentCellWords.push(wordText);
        }
        prevX1 = word.bbox.x1;
      }

      if (currentCellWords.length > 0) {
        rowCells.push(currentCellWords.join(' '));
      }

      if (rowCells.length > 0) {
        rawRows.push(rowCells);
      }
    }
  }

  // 3. Nettoyage sémantique des lignes parasites
  const cleanedRows = cleanSemanticRows(rawRows);

  const maxCols = Math.max(...cleanedRows.map((r) => r.length), 0);
  if (maxCols < 2) {
    onProgress?.('Structure peu marquée, passage au fallback texte brut...', 95);
    return cleanSemanticRows(fallbackRawTextToRows(rawText));
  }

  onProgress?.('Reconstruction du tableau terminée !', 100);
  return cleanedRows;
}

/**
 * Traite séquentiellement plusieurs images et concatène leurs lignes 2D.
 */
export async function extractTableFromMultipleImages(
  files: File[],
  onProgress?: (message: string, progressPercent: number) => void
): Promise<string[][]> {
  if (!files || files.length === 0) return [];

  const allRows: string[][] = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const pctBase = Math.round((i / files.length) * 100);

    const imgRows = await extractTableFromImage(file, (msg, pct) => {
      const totalPct = Math.min(99, Math.round(pctBase + (pct / files.length)));
      onProgress?.(`Photo ${i + 1}/${files.length} : ${msg}`, totalPct);
    });

    allRows.push(...imgRows);
  }

  onProgress?.('Reconstruction globale terminée !', 100);
  return allRows;
}

/**
 * Nettoie les lignes parasites et répétitives spécifiques aux maquettes (en-têtes répétées, crédits, mentions).
 */
function cleanSemanticRows(rows: string[][]): string[][] {
  const result: string[][] = [];

  for (const row of rows) {
    const nonEmptyCells = row.map((c) => c.trim()).filter((c) => c.length > 0);
    const fullRowText = nonEmptyCells.join(' ');

    if (nonEmptyCells.length === 1) {
      const txt = nonEmptyCells[0];
      if (
        /^©$/i.test(txt) ||
        /^page\s*\d*/i.test(txt) ||
        txt.length < 3 ||
        /UE\s*(FONDAMENTALES|SPECIALITE|METHODOLOGIE)/i.test(txt) ||
        /TOTAL\s+SEMESTRE/i.test(txt) ||
        /CONTENUS DES|MASSE HORAIRE|MODALITES|COEF|Crédit/i.test(txt) ||
        /MASTER|SEMESTRE N°/i.test(txt)
      ) {
        continue;
      }
    }

    if (
      nonEmptyCells.length <= 2 &&
      (/UE\s*(FONDAMENTALES|SPECIALITE|METHODOLOGIE)/i.test(fullRowText) ||
        /TOTAL\s+SEMESTRE/i.test(fullRowText) ||
        /CONTENUS DES|MASSE HORAIRE|MODALITES/i.test(fullRowText))
    ) {
      continue;
    }

    result.push(row);
  }

  return result;
}

/**
 * Fallback : découpe le texte brut en lignes et sépare par espaces multiples ou tabulations.
 */
function fallbackRawTextToRows(rawText: string): string[][] {
  if (!rawText) return [];
  const lines = rawText.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const rows: string[][] = [];

  for (const line of lines) {
    const parts = line.split(/\s{2,}|\t/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      rows.push(parts);
    } else {
      rows.push([line]);
    }
  }

  return rows;
}
