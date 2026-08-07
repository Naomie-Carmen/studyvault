import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../../types/document';
import * as previewService from '../../services/previewService';
import { Clock, FileText, ChevronRight } from 'lucide-react';

interface RecentlyViewedWidgetProps {
  onSelectDocument: (doc: DocumentItem) => void;
}

export const RecentlyViewedWidget: React.FC<RecentlyViewedWidgetProps> = ({
  onSelectDocument,
}) => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);

  useEffect(() => {
    previewService.getRecentlyViewed().then((res) => {
      if (res.success && res.data) setDocs(res.data);
    });
  }, []);

  if (docs.length === 0) return null;

  return (
    <div className="glass-card widget-card full-width-widget">
      <div className="widget-header">
        <Clock size={16} className="text-indigo" />
        <h3>Récemment consultés</h3>
      </div>

      <div className="recent-docs-grid">
        {docs.map((doc) => (
          <div key={doc.id} className="recent-doc-card" onClick={() => onSelectDocument(doc)}>
            <FileText size={18} className="text-indigo" />
            <div className="doc-details">
              <span className="doc-title" title={doc.originalName}>
                {doc.originalName}
              </span>
              <span className="doc-meta">{doc.docType.toUpperCase()}</span>
            </div>
            <ChevronRight size={14} className="chevron text-muted" />
          </div>
        ))}
      </div>

      <style>{`
        .recent-docs-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.75rem;
        }

        .recent-doc-card {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 0.85rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color);
          cursor: pointer;
          transition: background var(--transition-fast), border-color var(--transition-fast);
        }

        .recent-doc-card:hover {
          background: rgba(255, 255, 255, 0.07);
          border-color: var(--primary);
        }

        .doc-details {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }

        .doc-title {
          font-size: 0.825rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-meta {
          font-size: 0.675rem;
          color: var(--text-muted);
        }

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
