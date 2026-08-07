import React from 'react';
import { Shield, Code, Server } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <Shield size={14} />
          <span>StudyVault &copy; 2026 — Plateforme d'organisation académique</span>
        </div>

        <div className="footer-right">
          <div className="footer-item">
            <Code size={13} />
            <span>Frontend React 18 TS</span>
          </div>
          <span className="divider">•</span>
          <div className="footer-item">
            <Server size={13} />
            <span>Node.js Express API</span>
          </div>
        </div>
      </div>

      <style>{`
        .app-footer {
          background: var(--bg-secondary);
          border-top: 1px solid var(--border-color);
          padding: var(--space-md) var(--space-lg);
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
        }

        .footer-item {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .divider {
          opacity: 0.4;
        }
      `}</style>
    </footer>
  );
};
