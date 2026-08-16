import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseTextLinesToRows(text) {
  if (!text) return [];
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const rows = [];

  for (const line of lines) {
    // Nettoyage des caractères parasites d'encadrement
    const cleanedLine = line.replace(/^[|;:©\[\]\s]+|[|;:©\[\]\s]+$/g, '').trim();
    if (!cleanedLine) continue;

    const parts = cleanedLine
      .split(/\s*\|\s*|\s{2,}|\t/)
      .map((p) => p.trim())
      .filter(Boolean);

    if (parts.length > 0) {
      rows.push(parts);
    }
  }

  return rows;
}

function cleanSemanticRows(rows) {
  const result = [];

  for (const row of rows) {
    const nonEmptyCells = row.map((c) => String(c || '').trim()).filter((c) => c.length > 0);
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

async function runOCR(imagePath, imageName) {
  const buffer = fs.readFileSync(imagePath);
  const res = await Tesseract.recognize(buffer, 'fra+eng');

  const rawRows = parseTextLinesToRows(res.data.text);
  const cleanedRows = cleanSemanticRows(rawRows);

  console.log(`\n======================================================`);
  console.log(`=== PREUVE BRUTE JSON COMPLET (${imageName}) ===`);
  console.log(`======================================================`);
  console.log(JSON.stringify(cleanedRows, null, 2));

  return cleanedRows;
}

async function main() {
  const sem1Path = path.join(__dirname, 'semestre1.jpeg');
  const sem2Path = path.join(__dirname, 'semestre2.jpeg');

  const rows1 = await runOCR(sem1Path, 'semestre1.jpeg');
  const rows2 = await runOCR(sem2Path, 'semestre2.jpeg');
}

main().catch(console.error);
