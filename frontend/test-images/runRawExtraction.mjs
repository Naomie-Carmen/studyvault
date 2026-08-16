import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runOCR(imagePath, imageName) {
  console.log(`\n======================================================`);
  console.log(`[RAW OCR RUNNER] Execution Tesseract sur : ${imageName}`);
  console.log(`======================================================`);

  const imageBuffer = fs.readFileSync(imagePath);

  const res = await Tesseract.recognize(imageBuffer, 'fra+eng');
  const words = res.data.words || [];
  const lines = res.data.lines || [];

  console.log(`Texte brut extrait pour ${imageName} (${words.length} mots, ${lines.length} lignes) :`);
  console.log(`------------------------------------------------------`);
  console.log(res.data.text);
  console.log(`------------------------------------------------------`);

  // Extraire les mots avec confidence > 30
  const validWords = words
    .filter((w) => w.confidence > 30 && w.text && w.text.trim().length > 0)
    .map((w) => ({
      text: w.text.trim(),
      bbox: w.bbox,
    }));

  return { imageName, text: res.data.text, validWords, lines };
}

async function main() {
  const sem1Path = path.join(__dirname, 'semestre1.jpeg');
  const sem2Path = path.join(__dirname, 'semestre2.jpeg');

  const res1 = await runOCR(sem1Path, 'semestre1.jpeg');
  const res2 = await runOCR(sem2Path, 'semestre2.jpeg');
}

main().catch(console.error);
