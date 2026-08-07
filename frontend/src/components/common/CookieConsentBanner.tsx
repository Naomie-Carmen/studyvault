import React, { useState, useEffect } from 'react';
import { Cookie, Check } from 'lucide-react';

export const CookieConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('studyvault_cookie_consent');
    if (!consent) setVisible(true);
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('studyvault_cookie_consent', JSON.stringify({ analytics: true, content: true }));
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem('studyvault_cookie_consent', JSON.stringify({ analytics: false, content: false }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner-container glass-card">
      <div className="banner-left">
        <Cookie size={24} className="text-amber" />
        <div>
          <h4>Respect de votre vie privée &amp; Cookies RGPD</h4>
          <p>
            StudyVault utilise uniquement des cookies techniques essentiels et des mesures de fréquentation anonymisées. Aucune donnée n'est vendue ni partagée à des tiers.
          </p>
        </div>
      </div>

      <div className="banner-actions">
        <button className="btn-decline" onClick={handleDecline}>
          Continuer sans accepter
        </button>
        <button className="btn-accept" onClick={handleAcceptAll}>
          <Check size={16} />
          <span>Tout Accepter</span>
        </button>
      </div>

      <style>{`
        .cookie-banner-container {
          position: fixed; bottom: 1.25rem; left: 1.25rem; right: 1.25rem; z-index: 200;
          max-width: 900px; margin: 0 auto; padding: 1.15rem 1.5rem;
          display: flex; align-items: center; justify-content: space-between; gap: 1.5rem;
          border-color: rgba(99, 102, 241, 0.3); background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(16px); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.4);
        }

        @media (max-width: 768px) {
          .cookie-banner-container { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .banner-actions { width: 100%; justify-content: flex-end; }
        }

        .banner-left { display: flex; align-items: center; gap: 1rem; }
        .banner-left h4 { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.15rem; }
        .banner-left p { font-size: 0.8rem; color: var(--text-muted); max-width: 550px; }

        .banner-actions { display: flex; align-items: center; gap: 0.75rem; }

        .btn-decline { padding: 0.5rem 0.85rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; }
        .btn-accept { display: flex; align-items: center; gap: 0.35rem; padding: 0.5rem 1.15rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-size: 0.825rem; font-weight: 700; box-shadow: var(--shadow-glow); }

        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
};
