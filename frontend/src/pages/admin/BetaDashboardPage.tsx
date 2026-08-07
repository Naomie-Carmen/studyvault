import React, { useState, useEffect } from 'react';
import { Users, Ticket, FileText, MessageSquare, Plus, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface DashboardMetrics {
  users: {
    total: number;
    activeLast7Days: number;
  };
  invites: {
    total: number;
    used: number;
    pending: number;
    waitlistCount: number;
  };
  usage: {
    totalDocuments: number;
    classificationAcceptanceRate: number;
  };
  feedbacks: {
    bug: number;
    suggestion: number;
    love: number;
    question: number;
  };
}

interface FeedbackItem {
  id: string;
  type: string;
  message: string;
  rating?: number;
  pageUrl?: string;
  createdAt: string;
  user: {
    fullName: string;
    email: string;
  };
}

export const BetaDashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Generator State
  const [inviteEmail, setInviteEmail] = useState('');
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('studyvault_access_token');
      const headers = { Authorization: `Bearer ${token}` };

      const [metricsRes, feedbackRes] = await Promise.all([
        fetch('/api/v1/admin/dashboard', { headers }),
        fetch('/api/v1/feedback', { headers }),
      ]);

      if (metricsRes.ok) {
        const json = await metricsRes.json();
        setMetrics(json.data);
      } else {
        setError('Accès réservé aux administrateurs (rôle admin requis).');
      }

      if (feedbackRes.ok) {
        const json = await feedbackRes.json();
        setFeedbacks(json.data?.items || []);
      }
    } catch {
      setError('Impossible de joindre le serveur d\'administration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setGeneratingInvite(true);
    setGeneratedCode(null);

    try {
      const token = localStorage.getItem('studyvault_access_token');
      const res = await fetch('/api/v1/beta/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setGeneratedCode(json.data?.inviteCode || 'SV-INVITE');
        setInviteEmail('');
        loadDashboardData();
      } else {
        alert(json?.error?.message || 'Erreur lors de la génération de l\'invitation.');
      }
    } catch {
      alert('Erreur de communication.');
    } finally {
      setGeneratingInvite(false);
    }
  };

  if (error) {
    return (
      <div className="admin-error-container glass-card">
        <AlertTriangle size={32} className="text-amber" />
        <h2>Accès Administrateur Restreint</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h2>Dashboard Administration Bêta</h2>
          <p className="subtitle">Suivi des métriques, invitations, taux d'acceptation et retours d'expérience.</p>
        </div>
        <button className="btn-refresh" onClick={loadDashboardData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="metrics-grid">
          <div className="metric-card glass-card">
            <div className="card-top">
              <span className="card-title">Utilisateurs Inscrites</span>
              <Users size={18} className="text-indigo" />
            </div>
            <span className="metric-num">{metrics.users.total}</span>
            <small className="metric-sub">{metrics.users.activeLast7Days} actifs (7 derniers jours)</small>
          </div>

          <div className="metric-card glass-card">
            <div className="card-top">
              <span className="card-title">Invitations Bêta</span>
              <Ticket size={18} className="text-cyan" />
            </div>
            <span className="metric-num">{metrics.invites.used} / {metrics.invites.total}</span>
            <small className="metric-sub">{metrics.invites.waitlistCount} personnes en liste d'attente</small>
          </div>

          <div className="metric-card glass-card">
            <div className="card-top">
              <span className="card-title">Documents Importés</span>
              <FileText size={18} className="text-purple" />
            </div>
            <span className="metric-num">{metrics.usage.totalDocuments}</span>
            <small className="metric-sub">Taux acceptation IA : {metrics.usage.classificationAcceptanceRate}%</small>
          </div>

          <div className="metric-card glass-card">
            <div className="card-top">
              <span className="card-title">Feedbacks Reçus</span>
              <MessageSquare size={18} className="text-green" />
            </div>
            <span className="metric-num">
              {metrics.feedbacks.bug + metrics.feedbacks.suggestion + metrics.feedbacks.love + metrics.feedbacks.question}
            </span>
            <small className="metric-sub">
              🐛 {metrics.feedbacks.bug} • 💡 {metrics.feedbacks.suggestion} • ❤️ {metrics.feedbacks.love}
            </small>
          </div>
        </div>
      )}

      {/* Invite Generator */}
      <div className="glass-card invite-section">
        <h3>Générer un Code d'Invitation Bêta</h3>
        <form onSubmit={handleGenerateInvite} className="invite-form">
          <input
            type="email"
            placeholder="etudiant.invite@univ.fr"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            required
            disabled={generatingInvite}
          />
          <button type="submit" disabled={generatingInvite}>
            <Plus size={16} />
            <span>{generatingInvite ? 'Génération...' : 'Générer Code'}</span>
          </button>
        </form>

        {generatedCode && (
          <div className="generated-code-box">
            <CheckCircle2 size={16} className="text-green" />
            <span>Code d'invitation généré : <strong>{generatedCode}</strong></span>
          </div>
        )}
      </div>

      {/* Feedbacks Table */}
      <div className="glass-card feedbacks-section">
        <h3>Retours d'Expérience Récents ({feedbacks.length})</h3>
        {feedbacks.length === 0 ? (
          <p className="empty-msg">Aucun feedback reçu pour le moment.</p>
        ) : (
          <div className="feedbacks-list">
            {feedbacks.map((fb) => (
              <div key={fb.id} className="feedback-item-card">
                <div className="fb-header">
                  <span className={`fb-type-badge ${fb.type}`}>{fb.type.toUpperCase()}</span>
                  <span className="fb-user">{fb.user.fullName} ({fb.user.email})</span>
                  <span className="fb-date">{new Date(fb.createdAt).toLocaleDateString('fr-FR')}</span>
                </div>
                <p className="fb-message">{fb.message}</p>
                {fb.pageUrl && <span className="fb-page">Page : {fb.pageUrl}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .admin-dashboard-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 1000px; margin: 0 auto; }
        .admin-header { display: flex; align-items: center; justify-content: space-between; }
        .admin-header h2 { font-size: 1.4rem; font-weight: 800; }
        .subtitle { font-size: 0.85rem; color: var(--text-muted); }

        .btn-refresh { display: flex; align-items: center; gap: 0.35rem; padding: 0.55rem 0.95rem; border-radius: var(--radius-md); background: rgba(99,102,241,0.15); color: var(--primary); font-size: 0.825rem; font-weight: 600; border: 1px solid rgba(99,102,241,0.3); }

        .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
        @media (max-width: 768px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
        .metric-card { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .card-top { display: flex; align-items: center; justify-content: space-between; }
        .card-title { font-size: 0.775rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .metric-num { font-size: 1.6rem; font-weight: 900; color: var(--text-primary); }
        .metric-sub { font-size: 0.725rem; color: var(--text-secondary); }

        .invite-section, .feedbacks-section { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .invite-section h3, .feedbacks-section h3 { font-size: 1.05rem; font-weight: 700; border-bottom: 1px solid var(--border-color); pb: 0.5rem; }

        .invite-form { display: flex; gap: 0.5rem; max-width: 500px; }
        .invite-form input { flex: 1; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: #fff; font-size: 0.85rem; }
        .invite-form button { display: flex; align-items: center; gap: 0.35rem; padding: 0.6rem 1rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #fff; font-size: 0.85rem; font-weight: 700; }

        .generated-code-box { display: flex; align-items: center; gap: 0.5rem; padding: 0.6rem 0.85rem; border-radius: var(--radius-md); background: rgba(16,185,129,0.12); color: #10b981; border: 1px solid rgba(16,185,129,0.3); font-size: 0.85rem; width: fit-content; }

        .feedbacks-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .feedback-item-card { padding: 0.85rem 1rem; border-radius: var(--radius-md); background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); display: flex; flex-direction: column; gap: 0.35rem; }
        .fb-header { display: flex; align-items: center; gap: 0.75rem; font-size: 0.775rem; color: var(--text-muted); }
        .fb-type-badge { padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800; font-size: 0.65rem; }
        .fb-type-badge.bug { background: rgba(239,68,68,0.2); color: #ef4444; }
        .fb-type-badge.suggestion { background: rgba(99,102,241,0.2); color: #6366f1; }
        .fb-type-badge.love { background: rgba(236,72,153,0.2); color: #ec4899; }
        .fb-type-badge.question { background: rgba(6,182,212,0.2); color: #06b6d4; }
        .fb-message { font-size: 0.875rem; color: var(--text-primary); line-height: 1.5; }
        .fb-page { font-size: 0.7rem; color: var(--text-muted); }

        .empty-msg { font-size: 0.85rem; color: var(--text-muted); }
        .admin-error-container { text-align: center; padding: 3rem; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .text-indigo { color: var(--primary); }
        .text-cyan { color: #06b6d4; }
        .text-purple { color: #a855f7; }
        .text-green { color: #10b981; }
        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
};
