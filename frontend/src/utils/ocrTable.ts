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

/**
 * Reconstruit la structure 2D (tableau 2D string[][]) d'un document ou tableau
 * à partir des coordonnées des mots (bounding boxes Tesseract).
 */
export async function extractTableFromImage(
  file: File,
  onProgress?: (message: string, progressPercent: number) => void
): Promise<string[][]> {
  onProgress?.('Préparation et optimisation de l\'image...', 10);
  const canvas = await loadAndPrepareImage(file);

  onProgress?.('Analyse OCR et extraction des coordonnées...', 30);
  const res = await Tesseract.recognize(canvas, 'fra+eng', {
    logger: (m) => {
      if (m.status === 'recognizing text' && m.progress) {
        onProgress?.('Reconnaissance du texte et coordonnées...', Math.round(30 + m.progress * 50));
      }
    },
  });

  const rawText = res.data.text || '';
  const wordsRaw = (res.data as any).words as WordItem[] | undefined;

  // Fallback si pas de mots exploitables
  if (!wordsRaw || !Array.isArray(wordsRaw) || wordsRaw.length === 0) {
    onProgress?.('Utilisation du fallback texte brut...', 90);
    return fallbackRawTextToRows(rawText);
  }

  // Filtrage : confiance > 30 et texte non vide
  const words = wordsRaw.filter(
    (w) => w.confidence > 30 && w.text && w.text.trim().length > 0
  );

  if (words.length === 0) {
    return fallbackRawTextToRows(rawText);
  }

  // 1. Calcul de la hauteur médiane des mots pour définir les seuils adaptatifs
  const heights = words.map((w) => Math.abs(w.bbox.y1 - w.bbox.y0)).sort((a, b) => a - b);
  const medianHeight = heights[Math.floor(heights.length / 2)] || 20;

  // 2. Tri des mots par position verticale (y0)
  words.sort((a, b) => a.bbox.y0 - b.bbox.y0);

  // 3. Groupement en lignes horizontales
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
      // Nouvelle ligne si le haut du mot dépasse le bas de la ligne moins 40% de la hauteur médiane
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

  // 4. Groupement des cellules par ligne (colonnes)
  const rows: string[][] = [];

  for (const line of lines) {
    // Tri des mots de la ligne de gauche à droite (x0)
    line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);

    const lineHeights = line.words.map((w) => Math.abs(w.bbox.y1 - w.bbox.y0)).sort((a, b) => a - b);
    const lineMedianHeight = lineHeights[Math.floor(lineHeights.length / 2)] || medianHeight;

    // Seuil de séparation des colonnes
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
      rows.push(rowCells);
    }
  }

  // 5. Filtrage du bruit (mentions légales, numéros de page isolés, etc.)
  const cleanRows: string[][] = [];
  for (const row of rows) {
    if (row.length === 1) {
      const txt = row[0].trim();
      if (/^©$/i.test(txt) || /^page\s*\d*/i.test(txt) || txt.length < 3) {
        continue;
      }
    }
    cleanRows.push(row);
  }

  // 6. Vérification du nombre max de colonnes : si < 2 colonnes, fallback texte brut
  const maxCols = Math.max(...cleanRows.map((r) => r.length), 0);
  if (maxCols < 2) {
    onProgress?.('Structure peu marquée, passage au fallback...', 95);
    return fallbackRawTextToRows(rawText);
  }

  onProgress?.('Reconstruction du tableau terminée !', 100);
  return cleanRows;
}

/**
 * Traite séquentiellement plusieurs images et concatène leurs lignes 2D
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
