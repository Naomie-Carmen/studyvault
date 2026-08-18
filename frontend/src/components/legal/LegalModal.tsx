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
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1.25rem;
        }

        .legal-modal-dialog {
          width: 760px;
          max-width: 95vw;
          max-height: 88vh;
          display: flex;
          flex-direction: column;
          border-radius: 16px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.2);
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.8);
        }

        .legal-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.95);
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .title-group h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }
        .close-btn:hover { color: #ffffff; background: rgba(255, 255, 255, 0.15); }

        .legal-modal-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.75rem;
          background: rgba(10, 15, 30, 0.6);
        }

        .legal-text {
          white-space: pre-wrap;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 0.9rem;
          line-height: 1.7;
          color: #e2e8f0;
          margin: 0;
        }

        .legal-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(15, 23, 42, 0.95);
        }

        .footer-notice {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .btn-modal-close {
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
          background: #6366f1;
          color: #ffffff;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .btn-modal-close:hover { background: #4f46e5; }

        .text-emerald { color: #34d399; }
        .text-indigo { color: #818cf8; }
      `}</style>
    </div>
  );
};
