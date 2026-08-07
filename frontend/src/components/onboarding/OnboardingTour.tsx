import React, { useState, useCallback } from 'react';
import TourStep from './TourStep';
import { TOUR_DONE_KEY, TOUR_STEPS } from './tourConstants';

interface OnboardingTourProps {
  onComplete: () => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);

  const finishTour = useCallback(() => {
    localStorage.setItem(TOUR_DONE_KEY, '1');
    onComplete();
  }, [onComplete]);

  const handleNext = () => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Guide de démarrage StudyVault">
      {/* Dark backdrop */}
      <div className="onboarding-backdrop" onClick={finishTour} />

      {/* Step card */}
      <div className="onboarding-card-wrapper">
        <TourStep
          step={TOUR_STEPS[stepIndex]}
          currentIndex={stepIndex}
          totalSteps={TOUR_STEPS.length}
          onNext={handleNext}
          onPrev={handlePrev}
          onSkip={finishTour}
        />
      </div>

      <style>{`
        .onboarding-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }

        .onboarding-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
        }

        .onboarding-card-wrapper {
          position: relative;
          z-index: 10000;
          width: 100%;
          max-width: 480px;
          animation: tourAppear 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes tourAppear {
          from { opacity: 0; transform: scale(0.85) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        /* Tour step card */
        .tour-step-card {
          background: var(--bg-card, #1a1b2e);
          border: 1px solid rgba(99, 102, 241, 0.35);
          border-radius: 20px;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(99, 102, 241, 0.15);
        }

        /* Progress dots */
        .tour-progress {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .tour-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          transition: all 0.3s ease;
        }
        .tour-dot.active {
          width: 24px;
          border-radius: 4px;
          background: var(--primary, #6366f1);
        }
        .tour-dot.done {
          background: rgba(99, 102, 241, 0.45);
        }

        /* Icon */
        .tour-step-icon {
          font-size: 3rem;
          text-align: center;
          line-height: 1;
          animation: iconBounce 0.4s ease;
        }
        @keyframes iconBounce {
          0% { transform: scale(0.5); opacity: 0; }
          70% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        /* Content */
        .tour-step-content h3 {
          font-size: 1.2rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.5rem;
          text-align: center;
        }
        .tour-step-content p {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          line-height: 1.7;
          text-align: center;
        }

        /* Counter */
        .tour-counter {
          text-align: center;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.35);
          font-weight: 500;
        }

        /* Actions */
        .tour-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .tour-btn-skip {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
          padding: 0.4rem 0.5rem;
          transition: color 0.2s;
        }
        .tour-btn-skip:hover { color: rgba(255, 255, 255, 0.7); }

        .tour-nav {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .tour-btn-prev {
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.5);
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.2s;
        }
        .tour-btn-prev:hover { color: #ffffff; border-color: rgba(255, 255, 255, 0.3); }

        .tour-btn-next {
          padding: 0.6rem 1.35rem;
          border-radius: 10px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: #ffffff;
          font-size: 0.9rem;
          font-weight: 700;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .tour-btn-next:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
        }

        /* Mobile */
        @media (max-width: 520px) {
          .onboarding-card-wrapper { max-width: 100%; }
          .tour-step-card { padding: 1.5rem; }
          .tour-actions { justify-content: center; flex-direction: column-reverse; }
          .tour-nav { width: 100%; justify-content: center; }
          .tour-btn-next { flex: 1; }
        }
      `}</style>
    </div>
  );
};

export default OnboardingTour;
