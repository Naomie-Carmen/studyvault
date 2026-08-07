import React from 'react';
import { HealthCheckData } from '../../types/api';
import { Server, Database, Clock, Terminal, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

interface HealthCardProps {
  healthData: HealthCheckData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const HealthCard: React.FC<HealthCardProps> = ({ healthData, loading, error, onRefresh }) => {
  return (
    <div className="glass-card health-card">
      <div className="card-header">
        <div className="header-title">
          <Server className="title-icon" size={20} />
          <div>
            <h3>Diagnostic Backend & Santé Système</h3>
            <p className="subtitle">Vérification de l'endpoint <code>/api/v1/health</code></p>
          </div>
        </div>

        <button 
          className="refresh-card-btn" 
          onClick={onRefresh} 
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Tester l'API</span>
        </button>
      </div>

      {loading && !healthData && (
        <div className="card-state loading">
          <RefreshCw size={24} className="spin text-primary" />
          <p>Connexion à l'API Express en cours...</p>
        </div>
      )}

      {error && (
        <div className="card-state error">
          <AlertTriangle size={24} className="text-error" />
          <div>
            <h4>Erreur de Connexion Backend</h4>
            <p>{error}</p>
            <p className="tip">Assurez-vous que le serveur backend est démarré (`npm run dev:backend`).</p>
          </div>
        </div>
      )}

      {healthData && (
        <div className="card-body">
          <div className="metrics-grid">
            <div className="metric-box">
              <div className="metric-icon success">
                <CheckCircle2 size={18} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Statut API</span>
                <span className="metric-value capitalize">{healthData.status}</span>
              </div>
            </div>

            <div className="metric-box">
              <div className={`metric-icon ${healthData.database === 'connected' ? 'success' : 'warning'}`}>
                <Database size={18} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Base de Données</span>
                <span className="metric-value">
                  {healthData.database === 'connected' ? 'PostgreSQL Connecté' : 'Prête / En attente'}
                </span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-icon info">
                <Clock size={18} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Uptime Serveur</span>
                <span className="metric-value">{healthData.uptime} secondes</span>
              </div>
            </div>

            <div className="metric-box">
              <div className="metric-icon purple">
                <Terminal size={18} />
              </div>
              <div className="metric-content">
                <span className="metric-label">Environnement</span>
                <span className="metric-value uppercase">{healthData.environment}</span>
              </div>
            </div>
          </div>

          <div className="json-preview">
            <div className="json-header">Réponse JSON standardisée de l'API</div>
            <pre>{JSON.stringify(healthData, null, 2)}</pre>
          </div>
        </div>
      )}

      <style>{`
        .health-card {
          padding: var(--space-lg);
          margin-bottom: var(--space-xl);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-lg);
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .title-icon {
          color: var(--primary);
        }

        .header-title h3 {
          font-size: 1.125rem;
          line-height: 1.2;
        }

        .subtitle {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .subtitle code {
          background: rgba(255, 255, 255, 0.08);
          padding: 0.15rem 0.35rem;
          border-radius: var(--radius-sm);
          color: var(--primary);
        }

        .refresh-card-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--radius-md);
          background: rgba(99, 102, 241, 0.1);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
          font-size: 0.8rem;
          font-weight: 600;
          transition: all var(--transition-fast);
        }

        .refresh-card-btn:hover {
          background: var(--primary);
          color: #ffffff;
        }

        .card-state {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: var(--space-lg);
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.2);
        }

        .card-state.loading {
          justify-content: center;
          color: var(--text-muted);
        }

        .card-state.error {
          background: var(--status-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .card-state.error h4 {
          color: var(--status-error);
          font-size: 0.95rem;
        }

        .card-state.error p {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .tip {
          margin-top: 0.25rem;
          font-size: 0.75rem !important;
          color: var(--text-muted) !important;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(1, 1fr);
          gap: var(--space-md);
          margin-bottom: var(--space-lg);
        }

        @media (min-width: 640px) {
          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .metrics-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .metric-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
        }

        .metric-icon {
          width: 2.25rem;
          height: 2.25rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .metric-icon.success {
          background: var(--status-success-bg);
          color: var(--status-success);
        }

        .metric-icon.warning {
          background: var(--status-warning-bg);
          color: var(--status-warning);
        }

        .metric-icon.info {
          background: rgba(59, 130, 246, 0.12);
          color: #3b82f6;
        }

        .metric-icon.purple {
          background: rgba(168, 85, 247, 0.12);
          color: var(--accent-purple);
        }

        .metric-content {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .metric-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .capitalize { text-transform: capitalize; }
        .uppercase { text-transform: uppercase; }

        .json-preview {
          background: rgba(0, 0, 0, 0.4);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .json-header {
          padding: 0.4rem 0.875rem;
          background: rgba(255, 255, 255, 0.05);
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .json-preview pre {
          padding: 0.875rem;
          font-family: monospace;
          font-size: 0.75rem;
          color: var(--accent-cyan);
          overflow-x: auto;
          margin: 0;
        }
      `}</style>
    </div>
  );
};
