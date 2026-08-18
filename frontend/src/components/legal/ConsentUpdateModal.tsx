import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { fetchApi } from '../../services/apiClient';
import { LegalModal } from './LegalModal';

interface ConsentUpdateModalProps {
  onConsentAccepted: () => void;
}

export const ConsentUpdateModal: React.FC<ConsentUpdateModalProps> = ({ onConsentAccepted }) => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  const handleConfirm = async () => {
    if (!accepted) return;
    setLoading(true);
    try {
      let res = await fetchApi<{ consentAt: string }>('/users/consent', {
        method: 'POST',
      });
      if (!res.success) {
        res = await fetchApi<{ consentAt: string }>('/user/consent', {
          method: 'POST',
        });
      }
      if (!res.success) {
        res = await fetchApi<{ consentAt: string }>('/rgpd/accept-consent', {
          method: 'POST',
        });
      }
      if (res.success) {
        onConsentAccepted();
      } else {
        alert(res.error?.message || 'Erreur lors de la validation du consentement.');
      }
    } catch (_err) {
      alert('Erreur réseau lors de la validation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="consent-modal-backdrop">
        <div className="consent-modal-dialog glass-card">
          <div className="consent-modal-header">
            <ShieldCheck size={28} className="text-amber" />
            <div>
              <h3>Mise à jour de la Politique de Confidentialité</h3>
              <p className="subtitle">Loi n° 2013-450 du 19/06/2013 & Réglementation ARTCI</p>
            </div>
          </div>

          <div className="consent-modal-body">
            <p>
              Pour continuer à utiliser <strong>StudyVault</strong> (édité par <strong>Data Service Mica</strong>, Abidjan, Côte d'Ivoire), veuillez lire et accepter notre Politique de Confidentialité et nos Conditions Générales d'Utilisation.
            </p>

            <div className="consent-checkbox-box">
              <input
                type="checkbox"
                id="consentUpdateCheck"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
              />
              <label htmlFor="consentUpdateCheck">
                J'ai lu et j'accepte la{' '}
                <button type="button" className="link-btn" onClick={() => setLegalModalType('privacy')}>
                  Politique de Confidentialité
                </button>{' '}
                et les{' '}
                <button type="button" className="link-btn" onClick={() => setLegalModalType('terms')}>
                  CGU
                </button>.
              </label>
            </div>
          </div>

          <div className="consent-modal-footer">
            <button
              className="btn-accept-consent"
              disabled={!accepted || loading}
              onClick={handleConfirm}
            >
              {loading ? 'Validation...' : 'Accepter & Continuer'}
            </button>
          </div>
        </div>
      </div>

      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />

      <style>{`
        .consent-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 1.25rem;
        }

        .consent-modal-dialog {
          width: 480px;
          padding: 1.75rem;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(245, 158, 11, 0.4);
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        }

        .consent-modal-header {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .consent-modal-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .consent-modal-header .subtitle {
          font-size: 0.78rem;
          color: var(--text-muted);
          margin: 0;
        }

        .consent-modal-body p {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 1rem 0;
        }

        .consent-checkbox-box {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          padding: 0.85rem;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 0.825rem;
          color: var(--text-primary);
        }

        .consent-checkbox-box input {
          margin-top: 0.2rem;
          width: 16px;
          height: 16px;
          cursor: pointer;
        }

        .link-btn {
          background: none;
          border: none;
          color: #818cf8;
          text-decoration: underline;
          cursor: pointer;
          padding: 0;
          font: inherit;
        }

        .consent-modal-footer {
          display: flex;
          justify-content: flex-end;
        }

        .btn-accept-consent {
          width: 100%;
          padding: 0.65rem;
          border-radius: 8px;
          background: #6366f1;
          color: #ffffff;
          font-weight: 700;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-accept-consent:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .text-amber { color: #f59e0b; }
      `}</style>
    </>
  );
};
