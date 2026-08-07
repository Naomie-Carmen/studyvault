import React, { useState } from 'react';
import { DocumentItem } from '../../types/document';
import { getPreviewUrl } from '../../services/documentService';
import { 
  FileText, 
  Image as ImageIcon, 
  Eye, 
  Download, 
  Trash2, 
  MoreVertical, 
  Star, 
  Pin,
  FileSpreadsheet
} from 'lucide-react';

interface FileCardProps {
  document: DocumentItem;
  isFavorite?: boolean;
  isQuickAccess?: boolean;
  isSelected?: boolean;
  onPreview: (doc: DocumentItem) => void;
  onDelete: (doc: DocumentItem) => void;
  onToggleFavorite?: (doc: DocumentItem) => void;
  onToggleQuickAccess?: (doc: DocumentItem) => void;
  onSelectToggle?: (doc: DocumentItem) => void;
}

export const FileCard: React.FC<FileCardProps> = ({
  document,
  isFavorite = false,
  isQuickAccess = false,
  isSelected = false,
  onPreview,
  onDelete,
  onToggleFavorite,
  onToggleQuickAccess,
  onSelectToggle,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
    });
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const downloadUrl = getPreviewUrl(document.id).replace('/preview', '/download');
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className={`file-card glass-card ${isSelected ? 'selected' : ''}`}>
      <div className="file-card-top">
        {onSelectToggle && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelectToggle(document)}
            className="card-checkbox"
          />
        )}

        <div className="file-icon-badge">
          {isPdf && <FileText className="text-red" size={22} />}
          {isImage && <ImageIcon className="text-cyan" size={22} />}
          {!isPdf && !isImage && <FileSpreadsheet className="text-indigo" size={22} />}
        </div>

        <span className={`doc-type-pill ${document.docType}`}>
          {document.docType.toUpperCase()}
        </span>

        <div className="header-right-actions">
          {onToggleFavorite && (
            <button
              className={`icon-toggle-btn ${isFavorite ? 'active-star' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(document);
              }}
              title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
            >
              <Star size={16} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}

          {onToggleQuickAccess && (
            <button
              className={`icon-toggle-btn ${isQuickAccess ? 'active-pin' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleQuickAccess(document);
              }}
              title={isQuickAccess ? 'Retirer des accès rapides' : 'Épingler en accès rapide'}
            >
              <Pin size={16} />
            </button>
          )}

          <div className="menu-wrapper" onClick={(e) => e.stopPropagation()}>
            <button className="menu-btn" onClick={() => setShowMenu(!showMenu)}>
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <div className="context-dropdown" onMouseLeave={() => setShowMenu(false)}>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onPreview(document);
                  }}
                >
                  <Eye size={14} />
                  <span>Prévisualiser</span>
                </button>

                <button
                  onClick={(e) => {
                    setShowMenu(false);
                    handleDownload(e);
                  }}
                >
                  <Download size={14} />
                  <span>Télécharger</span>
                </button>

                <button
                  className="text-danger"
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(document);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Supprimer</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="file-card-body" onClick={() => onPreview(document)}>
        <h4 className="file-name" title={document.originalName}>
          {document.originalName}
        </h4>
        <div className="file-meta">
          <span>{formatSize(document.fileSize)}</span>
          <span className="dot">•</span>
          <span>{formatDate(document.createdAt)}</span>
        </div>
      </div>

      <div className="file-card-actions">
        <button className="action-btn" onClick={() => onPreview(document)} title="Prévisualiser">
          <Eye size={14} />
          <span>Aperçu</span>
        </button>

        <button className="action-btn" onClick={handleDownload} title="Télécharger">
          <Download size={14} />
          <span>Télécharger</span>
        </button>
      </div>

      <style>{`
        .file-card {
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          position: relative;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          transition: border-color var(--transition-fast), transform var(--transition-fast);
        }

        .file-card.selected {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.08);
        }

        .file-card:hover {
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-2px);
        }

        .file-card-top {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-checkbox {
          cursor: pointer;
          accent-color: var(--primary);
          width: 15px;
          height: 15px;
        }

        .file-icon-badge {
          width: 2rem;
          height: 2rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.04);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .doc-type-pill {
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-sm);
          font-size: 0.65rem;
          font-weight: 700;
          letter-spacing: 0.03em;
        }

        .doc-type-pill.cours { background: rgba(99, 102, 241, 0.15); color: var(--primary); }
        .doc-type-pill.TD { background: rgba(168, 85, 247, 0.15); color: var(--accent-purple); }
        .doc-type-pill.TP { background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan); }
        .doc-type-pill.examen { background: rgba(245, 158, 11, 0.15); color: var(--status-warning); }
        .doc-type-pill.autre { background: rgba(255, 255, 255, 0.1); color: var(--text-secondary); }

        .header-right-actions {
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .icon-toggle-btn {
          color: var(--text-muted);
          padding: 0.2rem;
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
        }

        .icon-toggle-btn:hover { color: var(--text-primary); }

        .icon-toggle-btn.active-star {
          color: #f59e0b;
        }

        .icon-toggle-btn.active-pin {
          color: var(--accent-cyan);
        }

        .menu-wrapper {
          position: relative;
        }

        .menu-btn {
          color: var(--text-muted);
          padding: 0.25rem;
        }

        .menu-btn:hover {
          color: var(--text-primary);
        }

        .context-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.25rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          z-index: 60;
          min-width: 140px;
          display: flex;
          flex-direction: column;
          padding: 0.35rem 0;
        }

        .context-dropdown button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.85rem;
          font-size: 0.8rem;
          color: var(--text-secondary);
          transition: background var(--transition-fast);
        }

        .context-dropdown button:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .context-dropdown button.text-danger:hover {
          color: var(--status-error);
          background: rgba(239, 68, 68, 0.1);
        }

        .file-card-body {
          cursor: pointer;
        }

        .file-name {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 0.25rem;
        }

        .file-meta {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.725rem;
          color: var(--text-muted);
        }

        .file-card-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-top: auto;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
          padding: 0.4rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.75rem;
          font-weight: 500;
        }

        .action-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary);
        }

        .text-red { color: #ef4444; }
        .text-cyan { color: var(--accent-cyan); }
        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
