import React, { useState } from 'react';
import { Shield, Mail } from 'lucide-react';
import { LegalModal } from '../legal/LegalModal';

export const Footer: React.FC = () => {
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);

  return (
    <>
      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-left">
            <Shield size={14} className="text-emerald" />
            <span>StudyVault &copy; 2026 — Édité par <strong>Data Service Mica</strong> (Abidjan, Côte d'Ivoire)</span>
          </div>

          <div className="footer-right">
            <button className="footer-link-btn" onClick={() => setLegalModalType('privacy')}>
              📜 Confidentialité
            </button>
            <span className="divider">•</span>
            <button className="footer-link-btn" onClick={() => setLegalModalType('terms')}>
              CGU
            </button>
            <span className="divider">•</span>
            <a href="mailto:data.service.mica@gmail.com" className="footer-link-btn flex-link">
              <Mail size={12} />
              <span>data.service.mica@gmail.com</span>
            </a>
          </div>
        </div>

        <style>{`
          .app-footer {
            background: var(--bg-secondary);
            border-top: 1px solid var(--border-color);
            padding: var(--space-sm) var(--space-lg);
            font-size: 0.75rem;
            color: var(--text-muted);
            margin-top: auto;
          }

          .footer-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            text-align: center;
          }

          @media (min-width: 640px) {
            .footer-content {
              flex-direction: row;
              justify-content: space-between;
              text-align: left;
            }
          }

          .footer-left, .footer-right {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            flex-wrap: wrap;
          }

          .footer-link-btn {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 0.75rem;
            cursor: pointer;
            padding: 0;
            text-decoration: none;
            transition: color 0.2s ease;
          }

          .footer-link-btn:hover {
            color: #818cf8;
            text-decoration: underline;
          }

          .flex-link {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
          }

          .divider {
            opacity: 0.4;
          }

          .text-emerald { color: #34d399; }
        `}</style>
      </footer>

      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />
    </>
  );
};
