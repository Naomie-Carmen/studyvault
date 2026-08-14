import { extractTableWithDetails, ExtractionResult } from './ocrTable';

/**
 * Utilitaire de débogage pour exécuter l'extraction OCR sur un fichier image
 * et afficher dans la console l'angle de désinclinaison, la grille détectée et les 15 premières lignes.
 */
export async function debugExtractTable(file: File): Promise<ExtractionResult> {
  console.log(`[debugOcr] Démarrage du débogage OCR sur la photo: ${file.name} (${Math.round(file.size / 1024)} KB)`);

  const result = await extractTableWithDetails(file, (msg, pct) => {
    console.log(`[debugOcr Progress ${pct}%] ${msg}`);
  });

  console.log(`=== RAPPORT DE DÉBOGAGE OCR (${file.name}) ===`);
  console.log(`Angle de désinclinaison optimal: ${result.bestAngle}°`);
  if (result.grid) {
    console.log(`Grille détectée: ${result.grid.horizontalLines.length} lignes H, ${result.grid.verticalLines.length} lignes V`);
    console.log(`Coordonnées H (Y):`, result.grid.horizontalLines);
    console.log(`Coordonnées V (X):`, result.grid.verticalLines);
  } else {
    console.log(`Grille non détectée (Fallback spatiale actif)`);
  }

  console.log(`Nombre total de mots reconnus avec confiance > 30: ${result.words.length}`);
  console.log(`Nombre de lignes 2D extraites: ${result.rows.length}`);

  console.log(`--- 15 PREMIÈRES LIGNES DU TABLEAU EXTRAIT ---`);
  const preview = result.rows.slice(0, 15);
  preview.forEach((row, idx) => {
    console.log(`Ligne ${idx + 1}: ${row.join(' | ')}`);
  });
  console.log(`===============================================`);

  return result;
}
