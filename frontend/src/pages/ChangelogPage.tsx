import React, { useState, useEffect } from 'react';
import { Sparkles, Calendar, ChevronRight, RefreshCw } from 'lucide-react';
import { API_BASE_URL } from '../services/apiClient';

interface VersionNote {
  version: string;
  releaseDate: string;
  highlights?: string[];
  notes?: string[];
}

const STATIC_HISTORY: VersionNote[] = [
  {
    version: '1.0.0',
    releaseDate: '2026-08-07',
    highlights: [
      '🚀 Lancement officiel de StudyVault',
      '📚 Structure académique complète (UE / ECUE / Matières)',
      '📁 Gestion documentaire avec coffre-fort personnel',
      '🔍 Recherche globale multi-critères',
      '📄 Visionneuse PDF et images intégrée',
      '📅 Emploi du temps hebdomadaire interactif',
      '🤖 OCR d\'emploi du temps depuis photo ou PDF',
      '🧠 Classement intelligent avec validation humaine obligatoire',
      '🔐 Conformité RGPD complète (export + suppression)',
      '🖥️ Application desktop Tauri (Windows / macOS / Linux)',
      '🔔 Mises à jour automatiques silencieuses',
      '🧭 Guide utilisateur interactif d\'onboarding',
    ],
  },
];

const ChangelogPage: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<VersionNote | null>(null);
  const [history, setHistory] = useState<VersionNote[]>(STATIC_HISTORY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadVersion() {
      try {
        const res = await fetch(`${API_BASE_URL}/version`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data) {
            setCurrentVersion({
              version: json.data.version,
              releaseDate: json.data.releaseDate,
              notes: json.data.notes,
            });
            if (Array.isArray(json.data.history) && json.data.history.length) {
              setHistory(json.data.history);
            }
          }
        }
      } catch {
        // fallback to static
      } finally {
        setLoading(false);
      }
    }
    loadVersion();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="changelog-page">
      {/* Header */}
      <div className="changelog-header">
        <div className="changelog-header-icon">
          <Sparkles size={26} />
        </div>
        <div>
          <h2>Nouveautés & Historique des Versions</h2>
          <p className="changelog-subtitle">Suivez l'évolution de StudyVault et découvrez les dernières améliorations.</p>
        </div>
      </div>

      {/* Current version badge */}
      {currentVersion && (
        <div className="current-version-card glass-card">
          <div className="cv-left">
            <span className="version-badge-current">Version actuelle</span>
            <span className="version-number">v{currentVersion.version}</span>
          </div>
          <div className="cv-right">
            <Calendar size={14} />
            <span>{formatDate(currentVersion.releaseDate)}</span>
          </div>
        </div>
      )}

      {loading && (
        <div className="changelog-loading glass-card">
          <RefreshCw size={18} className="spin" />
          <span>Chargement des notes de version…</span>
        </div>
      )}

      {/* Version history */}
      <div className="version-list">
        {history.map((v, idx) => (
          <div key={v.version} className={`version-card glass-card ${idx === 0 ? 'latest' : ''}`}>
            <div className="version-card-header">
              <div className="version-tag-row">
                <span className="version-tag">v{v.version}</span>
                {idx === 0 && <span className="badge-latest">Dernière version</span>}
              </div>
              <div className="version-date">
                <Calendar size={13} />
                <span>{formatDate(v.releaseDate)}</span>
              </div>
            </div>

            <ul className="version-notes">
              {Array.isArray(v.highlights) || Array.isArray(v.notes) ? (v.highlights || v.notes || []).map((note, ni) => (
                <li key={ni}>
                  <ChevronRight size={14} className="note-icon" />
                  <span>{note}</span>
                </li>
              )) : null}
            </ul>
          </div>
        ))}
      </div>

      <style>{`
        .changelog-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px; margin: 0 auto; }

        .changelog-header { display: flex; align-items: center; gap: 1rem; }
        .changelog-header-icon { width: 52px; height: 52px; border-radius: var(--radius-lg); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: var(--shadow-glow); flex-shrink: 0; }
        .changelog-header h2 { font-size: 1.35rem; font-weight: 800; }
        .changelog-subtitle { font-size: 0.85rem; color: var(--text-muted); }

        .current-version-card { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-color: rgba(99,102,241,0.3); }
        .cv-left { display: flex; align-items: center; gap: 0.75rem; }
        .version-badge-current { font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(99,102,241,0.15); color: var(--primary); border: 1px solid rgba(99,102,241,0.3); text-transform: uppercase; letter-spacing: 0.05em; }
        .version-number { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); }
        .cv-right { display: flex; align-items: center; gap: 0.4rem; font-size: 0.825rem; color: var(--text-muted); }

        .changelog-loading { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; font-size: 0.875rem; color: var(--text-muted); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .version-list { display: flex; flex-direction: column; gap: 1rem; }
        .version-card { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .version-card.latest { border-color: rgba(99,102,241,0.35); }

        .version-card-header { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem; }
        .version-tag-row { display: flex; align-items: center; gap: 0.65rem; }
        .version-tag { font-size: 1rem; font-weight: 800; color: var(--text-primary); }
        .badge-latest { font-size: 0.7rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 999px; background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .version-date { display: flex; align-items: center; gap: 0.35rem; font-size: 0.8rem; color: var(--text-muted); }

        .version-notes { display: flex; flex-direction: column; gap: 0.45rem; list-style: none; padding: 0; margin: 0; }
        .version-notes li { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.875rem; color: var(--text-secondary); line-height: 1.5; }
        .note-icon { color: var(--primary); flex-shrink: 0; margin-top: 2px; }
      `}</style>
    </div>
  );
};

export default ChangelogPage;
