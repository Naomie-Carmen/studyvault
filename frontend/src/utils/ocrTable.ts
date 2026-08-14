import Tesseract from 'tesseract.js';
import { loadAndPrepareImage } from './ocrImage';

export interface WordItem {
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

export interface ExtractionResult {
  rows: string[][];
  grid: DetectedGrid | null;
  words: WordItem[];
  deskewedCanvas: HTMLCanvasElement | null;
  bestAngle: number;
}

/**
 * Binarisation adaptative selon la méthode d'Otsu.
 * Transforme le canvas en image binaire (noir et blanc purs).
 */
export function binarizeOtsu(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const outCtx = outCanvas.getContext('2d');
  if (!ctx || !outCtx || width === 0 || height === 0) return canvas;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Calcul de l'histogramme à 256 niveaux de gris
  const histogram = new Array(256).fill(0);
  const grays = new Uint8Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    grays[i / 4] = gray;
    histogram[gray]++;
  }

  // 2. Calcul du seuil optimal d'Otsu
  const totalPixels = width * height;
  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVar = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > maxVar) {
      maxVar = varBetween;
      threshold = t;
    }
  }

  // 3. Application du seuil binaire
  const outImgData = outCtx.createImageData(width, height);
  const outData = outImgData.data;

  for (let i = 0; i < grays.length; i++) {
    const val = grays[i] < threshold ? 0 : 255;
    const idx = i * 4;
    outData[idx] = val;
    outData[idx + 1] = val;
    outData[idx + 2] = val;
    outData[idx + 3] = 255;
  }

  outCtx.putImageData(outImgData, 0, 0);
  return outCanvas;
}

/**
 * Désinclinaison (Deskew) automatique de l'image.
 * Teste les angles de -5° à +5° par pas de 0.5° et sélectionne l'angle qui
 * maximise la variance de la projection horizontale.
 */
export function deskew(canvas: HTMLCanvasElement): { canvas: HTMLCanvasElement; bestAngle: number } {
  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return { canvas, bestAngle: 0 };

  let bestAngle = 0;
  let maxVariance = -1;

  for (let angle = -5.0; angle <= 5.0; angle += 0.5) {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = width;
    testCanvas.height = height;
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx) continue;

    testCtx.save();
    testCtx.translate(width / 2, height / 2);
    testCtx.rotate((angle * Math.PI) / 180);
    testCtx.drawImage(canvas, -width / 2, -height / 2);
    testCtx.restore();

    const imgData = testCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const darkCounts = new Array(height).fill(0);
    for (let y = 0; y < height; y++) {
      let count = 0;
      const rowOffset = y * width * 4;
      for (let x = 0; x < width; x++) {
        const idx = rowOffset + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        if (0.299 * r + 0.587 * g + 0.114 * b < 128) {
          count++;
        }
      }
      darkCounts[y] = count;
    }

    const mean = darkCounts.reduce((a, b) => a + b, 0) / height;
    const variance = darkCounts.reduce((acc, val) => acc + (val - mean) ** 2, 0) / height;

    if (variance > maxVariance) {
      maxVariance = variance;
      bestAngle = angle;
    }
  }

  if (bestAngle === 0) {
    return { canvas, bestAngle: 0 };
  }

  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = width;
  resultCanvas.height = height;
  const resCtx = resultCanvas.getContext('2d');
  if (!resCtx) return { canvas, bestAngle: 0 };

  resCtx.save();
  resCtx.translate(width / 2, height / 2);
  resCtx.rotate((bestAngle * Math.PI) / 180);
  resCtx.drawImage(canvas, -width / 2, -height / 2);
  resCtx.restore();

  console.log(`[ocrTable] Angle de désinclinaison optimal détecté: ${bestAngle}° (Variance: ${Math.round(maxVariance)})`);
  return { canvas: resultCanvas, bestAngle };
}

/**
 * Détecte la grille par projection robuste sur l'image binarisée et redressée.
 * Filtre les lignes consécutives espacées de moins de 15px pour éviter les micro-cases.
 */
export function detectGrid(binarizedCanvas: HTMLCanvasElement): DetectedGrid | null {
  const width = binarizedCanvas.width;
  const height = binarizedCanvas.height;
  const ctx = binarizedCanvas.getContext('2d');
  if (!ctx || width === 0 || height === 0) return null;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // 1. Frontières HORIZONTALES : compte des pixels noirs par ligne Y
  const darkYCounts: number[] = new Array(height).fill(0);
  for (let y = 0; y < height; y++) {
    let count = 0;
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (data[rowOffset + x * 4] === 0) {
        count++;
      }
    }
    darkYCounts[y] = count;
  }

  const sortedCounts = darkYCounts.filter((c) => c > 0).sort((a, b) => a - b);
  const tableWidth = sortedCounts[Math.floor(sortedCounts.length * 0.95)] || width * 0.8;

  const darkYCandidates: boolean[] = new Array(height).fill(false);
  for (let y = 0; y < height; y++) {
    if (darkYCounts[y] > 0.6 * tableWidth) {
      darkYCandidates[y] = true;
    }
  }

  const rawHorizontalLines: number[] = [];
  let tempGroup: number[] = [];

  for (let y = 0; y < height; y++) {
    if (darkYCandidates[y]) {
      tempGroup.push(y);
    } else {
      if (tempGroup.length > 0) {
        const avgY = Math.round(tempGroup.reduce((a, b) => a + b, 0) / tempGroup.length);
        rawHorizontalLines.push(avgY);
        tempGroup = [];
      }
    }
  }
  if (tempGroup.length > 0) {
    const avgY = Math.round(tempGroup.reduce((a, b) => a + b, 0) / tempGroup.length);
    rawHorizontalLines.push(avgY);
  }

  // Filtrage des lignes horizontales trop proches (< 15px)
  const horizontalLines: number[] = [];
  for (const y of rawHorizontalLines) {
    if (horizontalLines.length === 0) {
      horizontalLines.push(y);
    } else {
      const prevY = horizontalLines[horizontalLines.length - 1];
      if (y - prevY >= 15) {
        horizontalLines.push(y);
      }
    }
  }

  if (horizontalLines.length < 3) return null;

  // 2. Frontières VERTICALES : calculées entre la première et la dernière ligne horizontale
  const minY = horizontalLines[0];
  const maxY = horizontalLines[horizontalLines.length - 1];
  const tableHeight = Math.max(1, maxY - minY);

  const darkXCounts: number[] = new Array(width).fill(0);
  for (let x = 0; x < width; x++) {
    let count = 0;
    for (let y = minY; y <= maxY; y++) {
      if (data[(y * width + x) * 4] === 0) {
        count++;
      }
    }
    darkXCounts[x] = count;
  }

  const darkXCandidates: boolean[] = new Array(width).fill(false);
  for (let x = 0; x < width; x++) {
    if (darkXCounts[x] > 0.5 * tableHeight) {
      darkXCandidates[x] = true;
    }
  }

  const rawVerticalLines: number[] = [];
  let tempXGroup: number[] = [];

  for (let x = 0; x < width; x++) {
    if (darkXCandidates[x]) {
      tempXGroup.push(x);
    } else {
      if (tempXGroup.length > 0) {
        const avgX = Math.round(tempXGroup.reduce((a, b) => a + b, 0) / tempXGroup.length);
        rawVerticalLines.push(avgX);
        tempXGroup = [];
      }
    }
  }
  if (tempXGroup.length > 0) {
    const avgX = Math.round(tempXGroup.reduce((a, b) => a + b, 0) / tempXGroup.length);
    rawVerticalLines.push(avgX);
  }

  // Filtrage des lignes verticales trop proches (< 15px)
  const verticalLines: number[] = [];
  for (const x of rawVerticalLines) {
    if (verticalLines.length === 0) {
      verticalLines.push(x);
    } else {
      const prevX = verticalLines[verticalLines.length - 1];
      if (x - prevX >= 15) {
        verticalLines.push(x);
      }
    }
  }

  if (verticalLines.length < 3) return null;

  return { horizontalLines, verticalLines };
}

/**
 * Reconstruit un tableau 2D string[][] à partir d'une grille (lignes H et V) et des mots extraits par OCR.
 */
export function reconstructRowsFromGrid(grid: DetectedGrid, words: WordItem[]): string[][] {
  const numRows = grid.horizontalLines.length - 1;
  const numCols = grid.verticalLines.length - 1;
  if (numRows <= 0 || numCols <= 0) return [];

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

  const rawRows: string[][] = [];
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

  return cleanSemanticRows(rawRows);
}

/**
 * Reconstruit la structure 2D (tableau 2D string[][]) d'une image de maquette avec détails d'extraction.
 */
export async function extractTableWithDetails(
  file: File,
  onProgress?: (message: string, progressPercent: number) => void
): Promise<ExtractionResult> {
  onProgress?.('Préparation et optimisation de l\'image...', 10);
  const preparedCanvas = await loadAndPrepareImage(file);

  onProgress?.('Désinclinaison automatique de l\'image...', 20);
  const { canvas: deskewedCanvas, bestAngle } = deskew(preparedCanvas);

  onProgress?.('Binarisation d\'Otsu et détection de grille...', 30);
  const otsuCanvas = binarizeOtsu(deskewedCanvas);
  const grid = detectGrid(otsuCanvas);

  if (deskewedCanvas.width < 40 || deskewedCanvas.height < 40) {
    console.warn('[ocrTable] Image trop petite (< 40px), passage d\'OCR ignoré.');
    return { rows: [], grid: null, words: [], deskewedCanvas: null, bestAngle: 0 };
  }

  onProgress?.('Reconnaissance OCR sur l\'image redressée...', 45);
  const res = await Tesseract.recognize(deskewedCanvas, 'fra+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        onProgress?.('Reconnaissance des mots et coordonnées...', Math.round(45 + m.progress * 40));
      }
    },
  });

  const rawText = res.data.text || '';
  const wordsRaw = (res.data as any).words as WordItem[] | undefined;

  if (!wordsRaw || !Array.isArray(wordsRaw) || wordsRaw.length === 0) {
    onProgress?.('Utilisation du fallback texte brut...', 90);
    return {
      rows: cleanSemanticRows(fallbackRawTextToRows(rawText)),
      grid: null,
      words: [],
      deskewedCanvas,
      bestAngle,
    };
  }

  const words = wordsRaw.filter(
    (w) => w.confidence > 30 && w.text && w.text.trim().length > 0
  );

  if (words.length === 0) {
    return {
      rows: cleanSemanticRows(fallbackRawTextToRows(rawText)),
      grid: null,
      words: [],
      deskewedCanvas,
      bestAngle,
    };
  }

  let rows: string[][] = [];

  if (grid) {
    rows = reconstructRowsFromGrid(grid, words);
  } else {
    console.log('[ocrTable] Grille non détectée. Passage au fallback par clustering spatiale.');
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

    const rawRows: string[][] = [];
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
    rows = cleanSemanticRows(rawRows);
  }

  const maxCols = Math.max(...rows.map((r) => r.length), 0);
  if (maxCols < 2) {
    onProgress?.('Structure peu marquée, passage au fallback texte brut...', 95);
    rows = cleanSemanticRows(fallbackRawTextToRows(rawText));
  }

  onProgress?.('Reconstruction du tableau terminée !', 100);
  return {
    rows,
    grid,
    words,
    deskewedCanvas,
    bestAngle,
  };
}

/**
 * Reconstruit la structure 2D (tableau 2D string[][]) d'une image de maquette.
 */
export async function extractTableFromImage(
  file: File,
  onProgress?: (message: string, progressPercent: number) => void
): Promise<string[][]> {
  const result = await extractTableWithDetails(file, onProgress);
  return result.rows;
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
 * Nettoie les lignes parasites et répétitives spécifiques aux maquettes.
 */
export function cleanSemanticRows(rows: string[][]): string[][] {
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
