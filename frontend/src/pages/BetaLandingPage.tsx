import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Search, Calendar, FolderCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { BetaBadge } from '../components/common/BetaBadge';

interface BetaLandingPageProps {
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
}

export const BetaLandingPage: React.FC<BetaLandingPageProps> = ({
  onNavigateLogin,
  onNavigateRegister,
}) => {
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/beta/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: waitlistEmail.trim() }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        setSuccessMsg(json.data?.message || 'Inscription réussie !');
        setWaitlistEmail('');
      } else {
        setErrorMsg(json?.error?.message || 'Erreur lors de l\'inscription.');
      }
    } catch {
      setErrorMsg('Impossible de contacter le serveur.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="landing-page">
      {/* Top Navbar */}
      <header className="landing-header">
        <div className="brand-group">
          <div className="brand-logo">
            <Sparkles size={20} />
          </div>
          <span className="brand-name">StudyVault</span>
          <BetaBadge size="md" />
        </div>

        <div className="nav-actions">
          {onNavigateLogin && (
            <button className="btn-login" onClick={onNavigateLogin}>
              Se Connecter
            </button>
          )}
          {onNavigateRegister && (
            <button className="btn-register" onClick={onNavigateRegister}>
              Créer un Compte
            </button>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section glass-card">
        <div className="hero-badge">
          <Sparkles size={14} />
          <span>Bêta Fermée sur Invitation</span>
        </div>

        <h1 className="hero-title">
          Le coffre-fort numérique de vos <span className="text-gradient">études universitaires</span>.
        </h1>

        <p className="hero-subtitle">
          Organisez automatiquement vos cours, TP, examens et emplois du temps dans une arborescence pédagogique intelligente. Multi-plateforme Web & Desktop.
        </p>

        {/* Waitlist Form */}
        <div className="waitlist-card">
          <h3>Rejoindre la Bêta Fermée</h3>
          <p className="waitlist-desc">
            Accès sur invitation uniquement. Inscrivez votre email pour recevoir votre code d'accès prioritaire.
          </p>

          {successMsg && (
            <div className="alert alert-success">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleWaitlistSubmit} className="waitlist-form">
            <input
              type="email"
              placeholder="votre.email@etud.univ.fr"
              value={waitlistEmail}
              onChange={(e) => setWaitlistEmail(e.target.value)}
              required
              disabled={submitting}
            />
            <button type="submit" disabled={submitting}>
              <span>{submitting ? 'Inscription...' : 'Rejoindre la Liste'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>

      {/* Features Grid */}
      <section className="features-section">
        <h2 className="section-title">Tout ce dont un étudiant a besoin</h2>

        <div className="features-grid">
          <div className="feature-card glass-card">
            <div className="feature-icon indigo">
              <FolderCheck size={24} />
            </div>
            <h3>Arborescence & Classement IA</h3>
            <p>
              Modélisez vos semestres, UE et matières. L'analyse heuristique suggère automatiquement où ranger chaque document avec validation humaine obligatoire.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon cyan">
              <Calendar size={24} />
            </div>
            <h3>Emploi du Temps OCR</h3>
            <p>
              Scannez une photo ou un PDF de votre emploi du temps : StudyVault extrait automatiquement vos créneaux et gère les conflits.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon purple">
              <Search size={24} />
            </div>
            <h3>Recherche Globale Instantanée</h3>
            <p>
              Retrouvez n'importe quelle fiche ou cours en un instant par mots-clés, tags, types de document ou matières.
            </p>
          </div>

          <div className="feature-card glass-card">
            <div className="feature-icon green">
              <ShieldCheck size={24} />
            </div>
            <h3>Coffre-fort & RGPD</h3>
            <p>
              Espace sécurisé séparé pour vos CV et diplômes. Chiffrement HTTPS, portabilité des données JSON et droit à l'oubli sous 30 jours.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© 2026 StudyVault — Tous droits réservés • Bêta Fermée v1.0.0</p>
      </footer>

      <style>{`
        .landing-page { display: flex; flex-direction: column; gap: 2rem; max-width: 1040px; margin: 0 auto; padding: 1rem; }

        .landing-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 0; border-bottom: 1px solid var(--border-color); }
        .brand-group { display: flex; align-items: center; gap: 0.65rem; }
        .brand-logo { width: 34px; height: 34px; border-radius: var(--radius-md); background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; color: #fff; box-shadow: var(--shadow-glow); }
        .brand-name { font-size: 1.25rem; font-weight: 800; color: var(--text-primary); }

        .nav-actions { display: flex; align-items: center; gap: 0.75rem; }
        .btn-login { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; padding: 0.4rem 0.85rem; }
        .btn-login:hover { color: #fff; }
        .btn-register { padding: 0.5rem 1rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #fff; font-size: 0.85rem; font-weight: 700; box-shadow: var(--shadow-glow); }

        .hero-section { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 3rem 2rem; gap: 1.5rem; }
        .hero-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.75rem; border-radius: 999px; background: rgba(99,102,241,0.12); color: var(--primary); font-size: 0.8rem; font-weight: 600; border: 1px solid rgba(99,102,241,0.3); }
        .hero-title { font-size: 2.2rem; font-weight: 900; max-width: 780px; line-height: 1.25; }
        .text-gradient { background: var(--gradient-primary); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .hero-subtitle { font-size: 1rem; color: var(--text-muted); max-width: 620px; line-height: 1.6; }

        .waitlist-card { width: 100%; max-width: 480px; padding: 1.5rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-lg); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.85rem; margin-top: 0.5rem; }
        .waitlist-card h3 { font-size: 1.1rem; font-weight: 700; color: #fff; }
        .waitlist-desc { font-size: 0.8rem; color: var(--text-muted); }

        .waitlist-form { display: flex; gap: 0.5rem; }
        .waitlist-form input { flex: 1; padding: 0.65rem 0.85rem; background: rgba(0,0,0,0.4); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: #fff; font-size: 0.85rem; outline: none; }
        .waitlist-form input:focus { border-color: var(--primary); }
        .waitlist-form button { display: flex; align-items: center; gap: 0.35rem; padding: 0.65rem 1rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #fff; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }

        .features-section { display: flex; flex-direction: column; gap: 1.5rem; }
        .section-title { font-size: 1.35rem; font-weight: 800; text-align: center; }
        .features-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
        @media (max-width: 640px) { .features-grid { grid-template-columns: 1fr; } }
        .feature-card { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .feature-icon { width: 44px; height: 44px; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; }
        .feature-icon.indigo { background: rgba(99,102,241,0.15); color: var(--primary); }
        .feature-icon.cyan { background: rgba(6,182,212,0.15); color: #06b6d4; }
        .feature-icon.purple { background: rgba(168,85,247,0.15); color: #a855f7; }
        .feature-icon.green { background: rgba(16,185,129,0.15); color: #10b981; }
        .feature-card h3 { font-size: 1.05rem; font-weight: 700; color: #fff; }
        .feature-card p { font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; }

        .alert { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.85rem; border-radius: var(--radius-md); font-size: 0.8rem; }
        .alert-success { background: var(--status-success-bg); color: var(--status-success); border: 1px solid rgba(16,185,129,0.3); }
        .alert-error { background: var(--status-error-bg); color: var(--status-error); border: 1px solid rgba(239,68,68,0.3); }

        .landing-footer { text-align: center; padding: 1.5rem 0; font-size: 0.8rem; color: var(--text-muted); border-top: 1px solid var(--border-color); }
      `}</style>
    </div>
  );
};
