import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function run() {
  const buffer = fs.readFileSync(path.join(__dirname, 'semestre1.jpeg'));
  const res = await Tesseract.recognize(buffer, 'fra+eng');

  console.log('TSV sample (first 500 chars):');
  console.log((res.data.tsv || '').slice(0, 500));

  console.log('\nhOCR sample (first 500 chars):');
  console.log((res.data.hocr || '').slice(0, 500));
}

run().catch(console.error);
