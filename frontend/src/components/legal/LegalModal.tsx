import React from 'react';
import { X, FileText, ShieldCheck } from 'lucide-react';
import privacyText from '../../legal/privacy.md?raw';
import termsText from '../../legal/terms.md?raw';

interface LegalModalProps {
  type: 'privacy' | 'terms' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  const title = type === 'privacy' 
    ? 'Politique de Confidentialité (Loi n° 2013-450 — ARTCI)' 
    : 'Conditions Générales d\'Utilisation (CGU)';
  
  const content = type === 'privacy' ? privacyText : termsText;

  return (
    <div className="legal-modal-backdrop" onClick={onClose}>
      <div className="legal-modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="legal-modal-header">
          <div className="title-group">
            {type === 'privacy' ? <ShieldCheck size={22} className="text-emerald" /> : <FileText size={22} className="text-indigo" />}
            <h3>{title}</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </button>
        </div>

        <div className="legal-modal-body">
          <pre className="legal-text">{content}</pre>
        </div>

        <div className="legal-modal-footer">
          <span className="footer-notice">
            Édité par <strong>Data Service Mica</strong> · Abidjan, Côte d'Ivoire · data.service.mica@gmail.com
          </span>
          <button className="btn-modal-close" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>

      <style>{`
        .legal-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          padding: 1.25rem;
        }

        .legal-modal-dialog {
          width: 720px;
          max-width: 95vw;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
        }

        .legal-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.9);
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .title-group h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
        }
        .close-btn:hover { color: #ffffff; background: rgba(255, 255, 255, 0.1); }

        .legal-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background: rgba(0, 0, 0, 0.2);
        }

        .legal-text {
          white-space: pre-wrap;
          font-family: inherit;
          font-size: 0.875rem;
          line-height: 1.6;
          color: #cbd5e1;
          margin: 0;
        }

        .legal-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(15, 23, 42, 0.9);
        }

        .footer-notice {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .btn-modal-close {
          padding: 0.45rem 1.25rem;
          border-radius: 8px;
          background: #6366f1;
          color: #ffffff;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }

        .text-emerald { color: #34d399; }
        .text-indigo { color: #818cf8; }
      `}</style>
    </div>
  );
};
