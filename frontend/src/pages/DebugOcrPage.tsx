import React, { useEffect, useState } from 'react';
import { extractTableWithDetails, ExtractionResult } from '../utils/ocrTable';

export const DebugOcrPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [progress, setProgress] = useState<string>('Initialisation...');
  const [sem1Result, setSem1Result] = useState<ExtractionResult | null>(null);
  const [sem2Result, setSem2Result] = useState<ExtractionResult | null>(null);

  useEffect(() => {
    async function runDebug() {
      try {
        setProgress('Chargement des photos réelles (semestre1.jpeg, semestre2.jpeg)...');

        const sem1Url = new URL('../../test-images/semestre1.jpeg', import.meta.url).href;
        const sem2Url = new URL('../../test-images/semestre2.jpeg', import.meta.url).href;

        const blob1 = await (await fetch(sem1Url)).blob();
        const file1 = new File([blob1], 'semestre1.jpeg', { type: 'image/jpeg' });

        const blob2 = await (await fetch(sem2Url)).blob();
        const file2 = new File([blob2], 'semestre2.jpeg', { type: 'image/jpeg' });

        setProgress('Extraction OCR sur semestre1.jpeg...');
        const res1 = await extractTableWithDetails(file1, (msg, pct) => {
          setProgress(`Semestre 1 (${pct}%): ${msg}`);
        });
        setSem1Result(res1);

        setProgress('Extraction OCR sur semestre2.jpeg...');
        const res2 = await extractTableWithDetails(file2, (msg, pct) => {
          setProgress(`Semestre 2 (${pct}%): ${msg}`);
        });
        setSem2Result(res2);

        setProgress('Extraction terminée !');
      } catch (err) {
        console.error('[DebugOcrPage] Erreur:', err);
        setProgress(`Erreur: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }

    runDebug();
  }, []);

  return (
    <div style={{ padding: '2rem', background: '#090d16', color: '#f8fafc', minHeight: '100vh', fontFamily: 'monospace' }}>
      <h1 style={{ color: '#818cf8', fontSize: '1.5rem', marginBottom: '1rem' }}>Page de Débogage OCR - Preuve Brute JSON</h1>
      <p style={{ background: 'rgba(255,255,255,0.05)', padding: '0.75rem', borderRadius: '6px', color: '#fbbf24' }}>
        Statut: {progress}
      </p>

      {loading && (
        <div style={{ margin: '2rem 0', color: '#38bdf8' }}>
          Extraction en cours avec Tesseract WASM... Veuillez patienter quelques secondes.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
        <div>
          <h2 style={{ color: '#34d399', fontSize: '1.1rem' }}>Semestre 1 (RAW JSON)</h2>
          {sem1Result && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Angle: {sem1Result.bestAngle}° | Lignes: {sem1Result.rows.length} | Grille: {sem1Result.grid?.horizontalLines.length || 0}H × {sem1Result.grid?.verticalLines.length || 0}V
            </p>
          )}
          <pre
            id="semestre1-raw"
            style={{
              background: '#020617',
              border: '1px solid #1e293b',
              padding: '1rem',
              borderRadius: '8px',
              maxHeight: '600px',
              overflow: 'auto',
              fontSize: '0.75rem',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {sem1Result ? JSON.stringify(sem1Result.rows, null, 2) : 'Chargement...'}
          </pre>
        </div>

        <div>
          <h2 style={{ color: '#34d399', fontSize: '1.1rem' }}>Semestre 2 (RAW JSON)</h2>
          {sem2Result && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Angle: {sem2Result.bestAngle}° | Lignes: {sem2Result.rows.length} | Grille: {sem2Result.grid?.horizontalLines.length || 0}H × {sem2Result.grid?.verticalLines.length || 0}V
            </p>
          )}
          <pre
            id="semestre2-raw"
            style={{
              background: '#020617',
              border: '1px solid #1e293b',
              padding: '1rem',
              borderRadius: '8px',
              maxHeight: '600px',
              overflow: 'auto',
              fontSize: '0.75rem',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {sem2Result ? JSON.stringify(sem2Result.rows, null, 2) : 'Chargement...'}
          </pre>
        </div>
      </div>
    </div>
  );
};
