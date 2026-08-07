import React, { useEffect, useState } from 'react';
import { DocumentItem } from '../../types/document';
import { getPreviewUrl } from '../../services/documentService';
import * as previewService from '../../services/previewService';
import { PDFViewer } from '../viewers/PDFViewer';
import { ImageViewer } from '../viewers/ImageViewer';
import { DocumentInfoPanel } from '../viewers/DocumentInfoPanel';
import { X, Download, FileText, Info } from 'lucide-react';

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  document,
}) => {
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      // Record view consultation event in background
      previewService.recordDocumentView(document.id, 5).catch(() => {});
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const previewUrl = getPreviewUrl(document.id);
  const isPdf = document.mimeType === 'application/pdf';
  const isImage = document.mimeType.startsWith('image/');

  const handleDownload = () => {
    window.open(`${previewUrl.replace('/preview', '/download')}`, '_blank');
  };

  return (
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Top Header */}
        <div className="preview-modal-header">
          <div className="title-group">
            <FileText size={18} className="text-indigo" />
            <span className="doc-name">{document.originalName}</span>
          </div>

          <div className="header-actions">
            <button
              className={`btn-info ${showInfo ? 'active' : ''}`}
              onClick={() => setShowInfo(!showInfo)}
              title="Informations & Métadonnées"
            >
              <Info size={16} />
            </button>
            <button className="btn-action" onClick={handleDownload} title="Télécharger">
              <Download size={16} />
              <span>Télécharger</span>
            </button>
            <button className="btn-close" onClick={onClose} title="Fermer (Échap)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport Content */}
        <div className="preview-modal-body">
          {isPdf ? (
            <PDFViewer
              previewUrl={previewUrl}
              title={document.originalName}
              onClose={onClose}
            />
          ) : isImage ? (
            <ImageViewer
              previewUrl={previewUrl}
              title={document.originalName}
              onClose={onClose}
            />
          ) : (
            <div className="unsupported-viewer">
              <FileText size={56} className="text-indigo mb-2" />
              <h3>Prévisualisation directe indisponible</h3>
              <p>Ce format de fichier ({document.mimeType}) ne peut pas être affiché directement.</p>
              <button className="download-cta-btn" onClick={handleDownload}>
                <Download size={18} />
                <span>Télécharger le fichier</span>
              </button>
            </div>
          )}

          {/* Slide-over Info Panel */}
          <DocumentInfoPanel
            document={document}
            isOpen={showInfo}
            onClose={() => setShowInfo(false)}
          />
        </div>
      </div>

      <style>{`
        .preview-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 120;
          padding: 1rem;
        }

        .preview-modal-container {
          width: 100%;
          max-width: 1150px;
          height: 88vh;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: var(--shadow-lg);
        }

        .preview-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          background: rgba(0, 0, 0, 0.4);
          border-bottom: 1px solid var(--border-color);
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          min-width: 0;
        }

        .doc-name {
          font-weight: 600;
          font-size: 0.95rem;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-info {
          color: var(--text-muted);
          padding: 0.4rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
        }

        .btn-info.active {
          color: var(--primary);
          background: rgba(99, 102, 241, 0.15);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.85rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .btn-close {
          color: var(--text-muted);
          padding: 0.35rem;
          border-radius: 50%;
        }

        .btn-close:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .preview-modal-body {
          flex: 1;
          background: #0f172a;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .unsupported-viewer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          text-align: center;
          padding: 2rem;
        }

        .unsupported-viewer h3 {
          font-size: 1.2rem;
          color: var(--text-primary);
        }

        .unsupported-viewer p {
          font-size: 0.875rem;
          color: var(--text-muted);
        }

        .download-cta-btn {
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.25rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
