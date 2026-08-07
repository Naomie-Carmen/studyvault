import React, { useState, useEffect } from 'react';
import { Cpu, Sparkles } from 'lucide-react';

interface ImportProgressProps {
  onComplete: () => void;
}

const STEPS = [
  'Lecture du fichier d\'emploi du temps...',
  'Extraction OCR des zones de texte...',
  'Analyse de la structure et des horaires...',
  'Calcul des scores de confiance et matching des matières...'
];

export const ImportProgress: React.FC<ImportProgressProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(10);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 400);
          return 100;
        }
        const next = p + 25;
        if (next >= 75) setCurrentStep(3);
        else if (next >= 50) setCurrentStep(2);
        else if (next >= 25) setCurrentStep(1);
        return next;
      });
    }, 450);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="glass-card ocr-progress-card">
      <div className="progress-header">
        <Cpu size={24} className="text-indigo animate-spin-slow" />
        <div>
          <h4>Analyse OCR & Extraction en cours</h4>
          <p className="step-label">{STEPS[currentStep]}</p>
        </div>
      </div>

      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
      </div>

      <div className="progress-footer">
        <span className="percent-span">{progress}% terminé</span>
        <span className="badge-ocr">
          <Sparkles size={12} /> Traitement heuristique
        </span>
      </div>

      <style>{`
        .ocr-progress-card {
          padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; border-color: rgba(99, 102, 241, 0.3);
        }

        .progress-header { display: flex; align-items: center; gap: 0.85rem; }
        .progress-header h4 { font-size: 1rem; font-weight: 700; color: var(--text-primary); }
        .step-label { font-size: 0.8rem; color: var(--text-muted); }

        .progress-bar-bg {
          width: 100%; height: 8px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%; background: var(--gradient-primary); transition: width 0.3s ease; border-radius: 4px;
        }

        .progress-footer { display: flex; align-items: center; justify-content: space-between; font-size: 0.775rem; color: var(--text-muted); }
        .percent-span { font-weight: 700; color: var(--accent-cyan); }
        .badge-ocr { display: flex; align-items: center; gap: 0.25rem; color: var(--primary); font-weight: 600; }
        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
