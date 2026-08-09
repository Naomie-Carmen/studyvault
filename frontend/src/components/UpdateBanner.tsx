import React, { useEffect, useRef, useState } from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const DISMISS_KEY = 'studyvault_update_dismissed_until';

async function fetchCurrentVersion(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/version`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.version ?? null;
  } catch {
    return null;
  }
}

export const UpdateBanner: React.FC = () => {
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const baselineVersion = useRef<string | null>(null);

  useEffect(() => {
    // Check if banner was dismissed recently
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // Capture the baseline version on first load
    fetchCurrentVersion().then((v) => {
      if (v) baselineVersion.current = v;
    });

    const interval = setInterval(async () => {
      const current = await fetchCurrentVersion();
      if (current && baselineVersion.current && current !== baselineVersion.current) {
        setNewVersion(current);
        setVisible(true);
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  const handleReload = () => {
    window.location.reload();
  };

  const handleDismiss = () => {
    // Dismiss for 30 minutes
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 30 * 60 * 1000));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="update-banner" role="alert" aria-live="polite">
      <div className="update-banner-content">
        <Sparkles size={16} className="update-icon" />
        <span className="update-text">
          Une nouvelle version de StudyVault est disponible{newVersion ? ` (v${newVersion})` : ''} !
        </span>
        <button className="btn-reload" onClick={handleReload} id="update-banner-reload-btn">
          <RefreshCw size={14} />
          <span>Recharger</span>
        </button>
        <button className="btn-dismiss" onClick={handleDismiss} aria-label="Ignorer" id="update-banner-dismiss-btn">
          <X size={14} />
        </button>
      </div>

      <style>{`
        .update-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          background: linear-gradient(90deg, rgba(99,102,241,0.95), rgba(168,85,247,0.95));
          backdrop-filter: blur(8px);
          padding: 0.55rem 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 20px rgba(99,102,241,0.4);
          animation: slideDown 0.35s ease;
        }

        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .update-banner-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.875rem;
          color: #ffffff;
        }

        .update-icon { color: #fbbf24; flex-shrink: 0; }
        .update-text { font-weight: 500; }

        .btn-reload {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.85rem;
          border-radius: 999px;
          background: rgba(255,255,255,0.2);
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 700;
          border: 1px solid rgba(255,255,255,0.4);
          transition: background 0.2s ease;
        }
        .btn-reload:hover { background: rgba(255,255,255,0.35); }

        .btn-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.2rem;
          color: rgba(255,255,255,0.7);
          transition: color 0.2s ease;
          margin-left: 0.25rem;
        }
        .btn-dismiss:hover { color: #ffffff; }
      `}</style>
    </div>
  );
};
