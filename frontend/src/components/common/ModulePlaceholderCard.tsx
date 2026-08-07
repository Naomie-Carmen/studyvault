import React from 'react';
import { ModuleStatus } from '../../types/api';
import { Layers, ArrowRight, CheckCircle } from 'lucide-react';

interface ModulePlaceholderCardProps {
  modules?: ModuleStatus[];
}

export const ModulePlaceholderCard: React.FC<ModulePlaceholderCardProps> = ({ modules = [] }) => {
  return (
    <div className="glass-card module-card">
      <div className="card-header">
        <div className="header-title">
          <Layers className="title-icon" size={20} />
          <div>
            <h3>Cartographie des Modules Métier StudyVault</h3>
            <p className="subtitle">Architecture extensible prête à accueillir les phases 2 à 8</p>
          </div>
        </div>
      </div>

      <div className="modules-list">
        {modules.map((m, idx) => {
          const isReady = m.status === 'ready';
          return (
            <div key={idx} className={`module-item ${isReady ? 'ready' : 'pending'}`}>
              <div className="module-info">
                {isReady ? (
                  <CheckCircle size={16} className="text-success" />
                ) : (
                  <ArrowRight size={16} className="text-muted" />
                )}
                <span className="module-name">{m.name}</span>
              </div>
              <span className={`badge ${isReady ? 'badge-success' : 'badge-pending'}`}>
                {isReady ? 'Opérationnel' : 'Prévu'}
              </span>
            </div>
          );
        })}
      </div>

      <style>{`
        .module-card {
          padding: var(--space-lg);
        }

        .modules-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .module-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          transition: background var(--transition-fast);
        }

        .module-item.ready {
          background: var(--gradient-card);
          border-color: rgba(99, 102, 241, 0.25);
        }

        .module-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .module-name {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .module-item.pending .module-name {
          color: var(--text-secondary);
        }

        .text-success { color: var(--status-success); }
        .text-muted { color: var(--text-muted); }
      `}</style>
    </div>
  );
};
