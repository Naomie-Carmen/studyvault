import React from 'react';

export interface TourStepData {
  id: string;
  title: string;
  description: string;
  targetSelector?: string; // CSS selector of element to highlight
  icon: string; // emoji
  position?: 'center' | 'top' | 'bottom';
}

interface TourStepProps {
  step: TourStepData;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

const TourStep: React.FC<TourStepProps> = ({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}) => {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;

  return (
    <div className="tour-step-card" role="dialog" aria-label={`Tour étape ${currentIndex + 1} sur ${totalSteps}`}>
      {/* Progress dots */}
      <div className="tour-progress">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div key={i} className={`tour-dot ${i === currentIndex ? 'active' : i < currentIndex ? 'done' : ''}`} />
        ))}
      </div>

      {/* Icon */}
      <div className="tour-step-icon">{step.icon}</div>

      {/* Content */}
      <div className="tour-step-content">
        <h3>{step.title}</h3>
        <p>{step.description}</p>
      </div>

      {/* Step counter */}
      <div className="tour-counter">
        Étape {currentIndex + 1} sur {totalSteps}
      </div>

      {/* Actions */}
      <div className="tour-actions">
        <button className="tour-btn-skip" onClick={onSkip} id="tour-skip-btn">
          Passer le tour
        </button>
        <div className="tour-nav">
          {!isFirst && (
            <button className="tour-btn-prev" onClick={onPrev} id="tour-prev-btn">
              ← Précédent
            </button>
          )}
          <button
            className="tour-btn-next"
            onClick={isLast ? onSkip : onNext}
            id={isLast ? 'tour-finish-btn' : 'tour-next-btn'}
          >
            {isLast ? '🎉 Commencer !' : 'Suivant →'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TourStep;
