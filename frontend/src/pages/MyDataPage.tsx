import React from 'react';
import { ShieldCheck, Server, Lock, Download, Trash2, Globe, ArrowRight } from 'lucide-react';

interface MyDataPageProps {
  onNavigatePrivacySettings?: () => void;
}

const MyDataPage: React.FC<MyDataPageProps> = ({ onNavigatePrivacySettings }) => {
  return (
    <div className="my-data-page">
      {/* Header */}
      <div className="data-header">
        <div className="data-header-icon">
          <ShieldCheck size={28} />
        </div>
        <div>
          <h2>Mes Données — Transparence & Contrôle</h2>
          <p className="data-subtitle">
            Tout ce que vous devez savoir sur le stockage et la gestion de vos données personnelles.
          </p>
        </div>
      </div>

      {/* Architecture Diagram */}
      <div className="glass-card data-diagram-card">
        <h3>Comment vos données sont-elles stockées ?</h3>

        <div className="data-flow">
          <div className="flow-node you-node">
            <Globe size={22} />
            <span>Votre navigateur</span>
            <small>ou application desktop</small>
          </div>

          <div className="flow-arrow">
            <div className="arrow-line" />
            <div className="arrow-label">
              <Lock size={12} />
              <span>HTTPS chiffré</span>
            </div>
          </div>

          <div className="flow-node server-node">
            <Server size={22} />
            <span>Serveurs StudyVault</span>
            <small>Espace privé dédié</small>
          </div>
        </div>

        <div className="data-principles">
          <div className="principle-item">
            <div className="principle-badge green">✓</div>
            <div>
              <strong>Chiffrement en transit</strong>
              <p>Toutes les communications utilisent HTTPS (TLS 1.3). Personne ne peut intercepter vos données en transit.</p>
            </div>
          </div>
          <div className="principle-item">
            <div className="principle-badge green">✓</div>
            <div>
              <strong>Isolation totale</strong>
              <p>Vos documents sont dans un espace de stockage privé. Aucun autre utilisateur ne peut y accéder.</p>
            </div>
          </div>
          <div className="principle-item">
            <div className="principle-badge green">✓</div>
            <div>
              <strong>Zéro IA externe</strong>
              <p>Vos fichiers ne sont jamais envoyés à des services IA tiers. L'analyse est effectuée localement sur nos serveurs.</p>
            </div>
          </div>
          <div className="principle-item">
            <div className="principle-badge green">✓</div>
            <div>
              <strong>Aucune revente de données</strong>
              <p>StudyVault ne vend, ne loue et ne partage jamais vos données à des tiers à des fins commerciales.</p>
            </div>
          </div>
        </div>
      </div>

      {/* What we store */}
      <div className="glass-card data-what-card">
        <h3>Quelles données sont stockées ?</h3>
        <div className="what-grid">
          <div className="what-item">
            <div className="what-header">
              <span className="what-dot blue" />
              <strong>Profil académique</strong>
            </div>
            <p>Université, formation, niveau, semestres actifs. Ces informations alimentent votre arborescence de classement.</p>
          </div>
          <div className="what-item">
            <div className="what-header">
              <span className="what-dot purple" />
              <strong>Documents importés</strong>
            </div>
            <p>Vos fichiers et leurs métadonnées (nom, type, taille, date d'import, tags). Les fichiers sont stockés dans votre espace privé.</p>
          </div>
          <div className="what-item">
            <div className="what-header">
              <span className="what-dot cyan" />
              <strong>Emploi du temps</strong>
            </div>
            <p>Vos séances (jour, heure, salle, matière) et les fichiers d'import OCR.</p>
          </div>
          <div className="what-item">
            <div className="what-header">
              <span className="what-dot green" />
              <strong>Préférences</strong>
            </div>
            <p>Consentements (analytics, analyse de contenu). Ces préférences sont modifiables à tout moment.</p>
          </div>
        </div>
      </div>

      {/* Your Rights */}
      <div className="glass-card data-rights-card">
        <h3>Vos droits (RGPD)</h3>
        <div className="rights-list">
          <div className="right-item" onClick={onNavigatePrivacySettings} style={{ cursor: onNavigatePrivacySettings ? 'pointer' : 'default' }}>
            <div className="right-icon">
              <Download size={18} />
            </div>
            <div className="right-info">
              <strong>Exporter mes données (Art. 20)</strong>
              <p>Téléchargez une archive JSON complète de toutes vos données en un clic.</p>
            </div>
            {onNavigatePrivacySettings && <ArrowRight size={16} className="right-arrow" />}
          </div>

          <div className="right-item" onClick={onNavigatePrivacySettings} style={{ cursor: onNavigatePrivacySettings ? 'pointer' : 'default' }}>
            <div className="right-icon red">
              <Trash2 size={18} />
            </div>
            <div className="right-info">
              <strong>Supprimer mon compte (Art. 17)</strong>
              <p>Désactivation immédiate et suppression définitive de toutes vos données sous 30 jours.</p>
            </div>
            {onNavigatePrivacySettings && <ArrowRight size={16} className="right-arrow" />}
          </div>
        </div>

        {onNavigatePrivacySettings && (
          <button className="btn-go-privacy" onClick={onNavigatePrivacySettings} id="my-data-go-privacy-btn">
            Accéder aux Paramètres de Confidentialité
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      <style>{`
        .my-data-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 840px; margin: 0 auto; }

        .data-header { display: flex; align-items: center; gap: 1rem; }
        .data-header-icon { width: 52px; height: 52px; border-radius: var(--radius-lg); background: linear-gradient(135deg, #10b981, #059669); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: 0 0 20px rgba(16,185,129,0.3); flex-shrink: 0; }
        .data-header h2 { font-size: 1.35rem; font-weight: 800; }
        .data-subtitle { font-size: 0.85rem; color: var(--text-muted); }

        .data-diagram-card, .data-what-card, .data-rights-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
        .data-diagram-card h3, .data-what-card h3, .data-rights-card h3 { font-size: 1rem; font-weight: 700; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }

        /* Flow diagram */
        .data-flow { display: flex; align-items: center; justify-content: center; gap: 1rem; padding: 1rem 0; flex-wrap: wrap; }
        .flow-node { display: flex; flex-direction: column; align-items: center; gap: 0.35rem; padding: 1rem 1.25rem; border-radius: var(--radius-lg); border: 2px solid var(--border-color); background: rgba(255,255,255,0.03); min-width: 140px; text-align: center; }
        .flow-node span { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
        .flow-node small { font-size: 0.725rem; color: var(--text-muted); }
        .you-node { border-color: rgba(99,102,241,0.4); color: var(--primary); }
        .server-node { border-color: rgba(16,185,129,0.4); color: #10b981; }

        .flow-arrow { display: flex; flex-direction: column; align-items: center; gap: 0.25rem; min-width: 80px; }
        .arrow-line { width: 100%; height: 2px; background: var(--gradient-primary); border-radius: 99px; }
        .arrow-label { display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; color: var(--text-muted); }

        /* Principles */
        .data-principles { display: flex; flex-direction: column; gap: 0.85rem; }
        .principle-item { display: flex; align-items: flex-start; gap: 0.85rem; }
        .principle-badge { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; flex-shrink: 0; }
        .principle-badge.green { background: rgba(16,185,129,0.2); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .principle-item strong { font-size: 0.875rem; color: var(--text-primary); }
        .principle-item p { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

        /* What we store */
        .what-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
        @media (max-width: 600px) { .what-grid { grid-template-columns: 1fr; } }
        .what-item { padding: 0.85rem; border-radius: var(--radius-md); background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); }
        .what-header { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
        .what-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
        .what-dot.blue { background: var(--primary); }
        .what-dot.purple { background: #a855f7; }
        .what-dot.cyan { background: #06b6d4; }
        .what-dot.green { background: #10b981; }
        .what-item strong { font-size: 0.875rem; color: var(--text-primary); }
        .what-item p { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; line-height: 1.6; }

        /* Rights */
        .rights-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .right-item { display: flex; align-items: center; gap: 0.85rem; padding: 0.9rem; border-radius: var(--radius-md); background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); transition: border-color 0.2s, background 0.2s; }
        .right-item:hover { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.05); }
        .right-icon { width: 40px; height: 40px; border-radius: var(--radius-md); background: rgba(99,102,241,0.15); display: flex; align-items: center; justify-content: center; color: var(--primary); flex-shrink: 0; }
        .right-icon.red { background: rgba(239,68,68,0.12); color: var(--status-error); }
        .right-info { flex: 1; }
        .right-info strong { font-size: 0.875rem; color: var(--text-primary); }
        .right-info p { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.1rem; }
        .right-arrow { color: var(--text-muted); }

        .btn-go-privacy { margin-top: 0.5rem; display: flex; align-items: center; gap: 0.5rem; padding: 0.7rem 1.25rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #fff; font-size: 0.875rem; font-weight: 700; box-shadow: var(--shadow-glow); width: fit-content; }
      `}</style>
    </div>
  );
};

export default MyDataPage;
