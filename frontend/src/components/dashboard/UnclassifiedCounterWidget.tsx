import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../../types/document';
import * as classificationService from '../../services/classificationService';
import { ClassificationModal } from '../classification/ClassificationModal';
import { HelpCircle, ChevronRight, FileText } from 'lucide-react';

interface UnclassifiedCounterWidgetProps {
  onNavigateToDocuments?: () => void;
}

export const UnclassifiedCounterWidget: React.FC<UnclassifiedCounterWidgetProps> = ({
  onNavigateToDocuments,
}) => {
  const [unclassifiedDocs, setUnclassifiedDocs] = useState<DocumentItem[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const loadDocs = () => {
    classificationService.getUnclassifiedDocuments().then((res) => {
      if (res.success && Array.isArray(res.data)) setUnclassifiedDocs(res.data);
    });
  };

  useEffect(() => {
    loadDocs();
  }, []);

  if (unclassifiedDocs.length === 0) return null;

  return (
    <div className="glass-card widget-card full-width-widget unclassified-widget">
      <div className="widget-header">
        <div className="header-left">
          <HelpCircle size={18} className="text-amber" />
          <h3>{unclassifiedDocs.length} document(s) en attente de classement</h3>
        </div>
        {onNavigateToDocuments && (
          <button className="btn-view-all" onClick={onNavigateToDocuments}>
            <span>Voir la bibliothèque</span>
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      <div className="unclassified-list">
        {unclassifiedDocs.slice(0, 4).map((doc) => (
          <div key={doc.id} className="unclassified-doc-item">
            <FileText size={16} className="text-indigo" />
            <span className="doc-name">{doc.originalName}</span>
            <button className="btn-classify-now" onClick={() => setSelectedDoc(doc)}>
              Classer en 1 clic
            </button>
          </div>
        ))}
      </div>

      <ClassificationModal
        isOpen={!!selectedDoc}
        document={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onSuccess={loadDocs}
      />

      <style>{`
        .unclassified-widget { border-color: rgba(245, 158, 11, 0.3); }

        .widget-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
        .header-left { display: flex; align-items: center; gap: 0.5rem; }

        .btn-view-all { display: flex; align-items: center; gap: 0.2rem; font-size: 0.775rem; color: var(--primary); font-weight: 600; }

        .unclassified-list { display: flex; flex-direction: column; gap: 0.5rem; }

        .unclassified-doc-item {
          display: flex; align-items: center; gap: 0.65rem; padding: 0.55rem 0.85rem; border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color);
        }

        .doc-name { font-size: 0.825rem; font-weight: 600; color: var(--text-primary); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .btn-classify-now {
          padding: 0.3rem 0.65rem; border-radius: var(--radius-sm); background: rgba(99, 102, 241, 0.15);
          color: var(--primary); font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .btn-classify-now:hover { background: var(--gradient-primary); color: #ffffff; }

        .text-amber { color: #f59e0b; }
        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
