import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../../types/document';
import { DocumentMetadata } from '../../types/viewer';
import * as previewService from '../../services/previewService';
import { X, Info, Calendar, Eye, Layers } from 'lucide-react';

interface DocumentInfoPanelProps {
  document: DocumentItem;
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentInfoPanel: React.FC<DocumentInfoPanelProps> = ({
  document,
  isOpen,
  onClose,
}) => {
  const [meta, setMeta] = useState<DocumentMetadata | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      previewService.getDocumentMetadata(document.id).then((res) => {
        if (res.success && res.data) setMeta(res.data);
      });
    }
  }, [isOpen, document]);

  if (!isOpen) return null;

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="info-panel-slideover glass-card">
      <div className="panel-header">
        <div className="header-title">
          <Info size={16} className="text-indigo" />
          <span>Informations sur le Document</span>
        </div>
        <button className="close-btn" onClick={onClose}>
          <X size={16} />
        </button>
      </div>

      <div className="panel-body">
        <div className="info-row">
          <span className="info-label">Nom du fichier</span>
          <span className="info-val font-semibold">{document.originalName}</span>
        </div>

        <div className="info-row">
          <span className="info-label">Catégorie</span>
          <span className="info-val uppercase-badge">{document.docType}</span>
        </div>

        <div className="info-row">
          <span className="info-label">Taille</span>
          <span className="info-val">{formatSize(document.fileSize)}</span>
        </div>

        {meta?.pageCountEstimate && (
          <div className="info-row">
            <span className="info-label">Pages estimées</span>
            <span className="info-val">{meta.pageCountEstimate} page(s)</span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">Type MIME</span>
          <span className="info-val text-muted">{document.mimeType}</span>
        </div>

        {meta?.subjectName && (
          <div className="info-row">
            <span className="info-label">Matière</span>
            <span className="info-val text-indigo-light">
              <Layers size={12} /> {meta.subjectName}
            </span>
          </div>
        )}

        {meta?.ueTitle && (
          <div className="info-row">
            <span className="info-label">Unité d'Enseignement</span>
            <span className="info-val">{meta.ueTitle}</span>
          </div>
        )}

        <div className="info-row">
          <span className="info-label">Date d'importation</span>
          <span className="info-val">
            <Calendar size={12} /> {formatDate(document.createdAt)}
          </span>
        </div>

        {meta && (
          <div className="info-row">
            <span className="info-label">Vues totales</span>
            <span className="info-val">
              <Eye size={12} /> {meta.viewCount} consultation(s)
            </span>
          </div>
        )}
      </div>

      <style>{`
        .info-panel-slideover {
          position: absolute;
          right: 0;
          top: 0;
          bottom: 0;
          width: 300px;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(12px);
          border-left: 1px solid var(--border-color);
          z-index: 100;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 700;
        }

        .close-btn { color: var(--text-muted); }
        .close-btn:hover { color: var(--text-primary); }

        .panel-body {
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          overflow-y: auto;
        }

        .info-row {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .info-label {
          font-size: 0.725rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .info-val {
          font-size: 0.85rem;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .font-semibold { font-weight: 600; word-break: break-all; }
        .uppercase-badge {
          display: inline-block;
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.15rem 0.4rem;
          border-radius: var(--radius-sm);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
        }

        .text-indigo { color: var(--primary); }
        .text-indigo-light { color: var(--accent-cyan); font-weight: 600; }
        .text-muted { color: var(--text-muted); font-size: 0.75rem; }
      `}</style>
    </div>
  );
};
