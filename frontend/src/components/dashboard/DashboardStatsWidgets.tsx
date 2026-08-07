import React from 'react';
import { DashboardStats, QuickAccessItem } from '../../types/search';
import { DocumentItem } from '../../types/document';
import { 
  FileText, 
  Layers, 
  Sparkles, 
  Pin, 
  BookOpen, 
  HardDrive
} from 'lucide-react';

interface DashboardStatsWidgetsProps {
  stats: DashboardStats | null;
  quickAccessList: QuickAccessItem[];
  onSelectDocument: (doc: DocumentItem) => void;
  onNavigateSearch: () => void;
}

export const DashboardStatsWidgets: React.FC<DashboardStatsWidgetsProps> = ({
  stats,
  quickAccessList,
  onSelectDocument,
}) => {
  if (!stats) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const usedPercentage = Math.min(
    100,
    parseFloat(((stats.storageUsedBytes / stats.storageQuotaBytes) * 100).toFixed(1))
  );

  return (
    <div className="dashboard-widgets-container">
      {/* Top Metric Cards */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-icon bg-indigo">
            <FileText size={22} className="text-indigo" />
          </div>
          <div className="metric-data">
            <span className="metric-number">{stats.totalDocuments}</span>
            <span className="metric-label">Total Documents</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon bg-purple">
            <Sparkles size={22} className="text-purple" />
          </div>
          <div className="metric-data">
            <span className="metric-number">{stats.favoritesCount}</span>
            <span className="metric-label">Favoris Épinglés</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon bg-cyan">
            <Pin size={22} className="text-cyan" />
          </div>
          <div className="metric-data">
            <span className="metric-number">{stats.quickAccessCount}</span>
            <span className="metric-label">Accès Rapides</span>
          </div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-icon bg-green">
            <HardDrive size={22} className="text-green" />
          </div>
          <div className="metric-data">
            <span className="metric-number">{usedPercentage}%</span>
            <span className="metric-label">Disque ({formatSize(stats.storageUsedBytes)})</span>
          </div>
        </div>
      </div>

      {/* Main Section: Quick Access & Recent Uploads */}
      <div className="widgets-row">
        {/* Quick Access Pinned Files Widget */}
        <div className="glass-card widget-card">
          <div className="widget-header">
            <Pin size={16} className="text-cyan" />
            <h3>Accès Rapides ({quickAccessList.length}/10)</h3>
          </div>

          {quickAccessList.length > 0 ? (
            <div className="quick-access-list">
              {quickAccessList.map((item) => (
                <div
                  key={item.id}
                  className="quick-item"
                  onClick={() => onSelectDocument(item.document)}
                >
                  <FileText size={16} className="text-indigo" />
                  <span className="quick-name" title={item.document.originalName}>
                    {item.document.originalName}
                  </span>
                  <span className="type-badge">{item.document.docType.toUpperCase()}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="widget-empty">
              <span>Épinglez vos documents les plus importants pour y accéder en 1 clic.</span>
            </div>
          )}
        </div>

        {/* Breakdown By Document Type */}
        <div className="glass-card widget-card">
          <div className="widget-header">
            <Layers size={16} className="text-purple" />
            <h3>Répartition par Catégorie</h3>
          </div>

          <div className="breakdown-grid">
            <div className="breakdown-item">
              <span className="type-title">COURS</span>
              <span className="type-count">{stats.documentsByType.cours}</span>
            </div>
            <div className="breakdown-item">
              <span className="type-title">TRAVAUX DIRIGÉS (TD)</span>
              <span className="type-count">{stats.documentsByType.TD}</span>
            </div>
            <div className="breakdown-item">
              <span className="type-title">TRAVAUX PRATIQUES (TP)</span>
              <span className="type-count">{stats.documentsByType.TP}</span>
            </div>
            <div className="breakdown-item">
              <span className="type-title">EXAMENS & ANNALES</span>
              <span className="type-count">{stats.documentsByType.examen}</span>
            </div>
            <div className="breakdown-item">
              <span className="type-title">AUTRES DOCUMENTS</span>
              <span className="type-count">{stats.documentsByType.autre}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Most Used Subjects */}
      {stats.mostUsedSubjects.length > 0 && (
        <div className="glass-card widget-card full-width-widget">
          <div className="widget-header">
            <BookOpen size={16} className="text-indigo" />
            <h3>Matières les plus actives</h3>
          </div>

          <div className="subjects-chips-list">
            {stats.mostUsedSubjects.map((sub) => (
              <div key={sub.id} className="subject-chip">
                <span className="subject-name">{sub.name}</span>
                <span className="subject-doc-count">{sub.documentCount} fichier(s)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .dashboard-widgets-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }

        .metric-card {
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .metric-icon {
          width: 2.75rem;
          height: 2.75rem;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bg-indigo { background: rgba(99, 102, 241, 0.15); }
        .bg-purple { background: rgba(168, 85, 247, 0.15); }
        .bg-cyan { background: rgba(6, 182, 212, 0.15); }
        .bg-green { background: rgba(16, 185, 129, 0.15); }

        .metric-data {
          display: flex;
          flex-direction: column;
        }

        .metric-number {
          font-size: 1.35rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .metric-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .widgets-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.25rem;
        }

        @media (max-width: 768px) {
          .widgets-row { grid-template-columns: 1fr; }
        }

        .widget-card {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }

        .widget-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .widget-header h3 {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .quick-access-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .quick-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.5rem 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .quick-item:hover {
          background: rgba(255, 255, 255, 0.07);
        }

        .quick-name {
          flex: 1;
          font-size: 0.825rem;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .type-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: var(--radius-sm);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }

        .widget-empty {
          padding: 1.5rem;
          text-align: center;
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .breakdown-grid {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .breakdown-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.75rem;
          border-radius: var(--radius-sm);
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
        }

        .type-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .type-count {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--primary);
        }

        .subjects-chips-list {
          display: flex;
          gap: 0.65rem;
          flex-wrap: wrap;
        }

        .subject-chip {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
        }

        .subject-name {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .subject-doc-count {
          font-size: 0.725rem;
          color: var(--primary);
          font-weight: 700;
        }

        .text-indigo { color: var(--primary); }
        .text-purple { color: var(--accent-purple); }
        .text-cyan { color: var(--accent-cyan); }
        .text-green { color: var(--status-success); }
      `}</style>
    </div>
  );
};
