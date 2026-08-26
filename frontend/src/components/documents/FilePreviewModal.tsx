import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { DocumentItem } from '../../types/document';
import { getPreviewUrl } from '../../services/documentService';
import * as previewService from '../../services/previewService';
import * as fileOrganizer from '../../services/fileOrganizer';
import { PDFViewer } from '../viewers/PDFViewer';
import { ImageViewer } from '../viewers/ImageViewer';
import { DocumentInfoPanel } from '../viewers/DocumentInfoPanel';
import { X, Download, FileText, Info, ExternalLink } from 'lucide-react';

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
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  const ext = useMemo(() => {
    if (!document) return '';
    return document.originalName.split('.').pop()?.toLowerCase() || '';
  }, [document]);

  const isPdf = useMemo(() => {
    if (!document) return false;
    return document.mimeType === 'application/pdf' || ext === 'pdf';
  }, [document, ext]);

  const isImage = useMemo(() => {
    if (!document) return false;
    return document.mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext);
  }, [document, ext]);

  const isText = useMemo(() => {
    if (!document) return false;
    return (
      document.mimeType.startsWith('text/') ||
      ['txt', 'md', 'json', 'js', 'ts', 'css', 'html', 'py', 'c', 'cpp', 'java', 'log'].includes(ext)
    );
  }, [document, ext]);

  // Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const [loadError, setLoadError] = useState<string | null>(null);

  // Load Blob or Text content for preview
  useEffect(() => {
    if (isOpen && document) {
      previewService.recordDocumentView(document.id, 5).catch(() => {});
      setLoadError(null);

      let isCancelled = false;

      const loadPreview = async () => {
        // 1. Check local file if running in Tauri desktop mode
        if (fileOrganizer.isTauri && document.filePath) {
          try {
            const { exists } = await import('@tauri-apps/api/fs');
            const { convertFileSrc } = await import('@tauri-apps/api/tauri');

            if (await exists(document.filePath)) {
              const src = convertFileSrc(document.filePath);
              if (!isCancelled) {
                setObjectUrl(src);
                return;
              }
            }
          } catch (_e) {
            /* ignore & fallback to network fetch */
          }
        }

        // 2. Fetch from backend URL
        const url = getPreviewUrl(document.id);
        try {
          const res = await fetch(url);
          if (!res.ok) {
            let errorMsg = `Erreur HTTP ${res.status}`;
            try {
              const json = await res.json();
              if (json.error?.message) errorMsg = json.error.message;
            } catch (_e) { /* ignore */ }
            throw new Error(errorMsg);
          }

          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const json = await res.json();
            throw new Error(json.error?.message || 'Fichier introuvable sur le serveur.');
          }

          if (isText) {
            const text = await res.text();
            if (!isCancelled) {
              setTextContent(text);
              setLoadingText(false);
            }
          } else {
            const blob = await res.blob();
            const blobUrl = URL.createObjectURL(blob);
            if (!isCancelled) setObjectUrl(blobUrl);
          }
        } catch (err: any) {
          console.error('FilePreviewModal load error:', err);
          if (!isCancelled) {
            setObjectUrl(null);
            setLoadError(err.message || 'Fichier introuvable sur le serveur.');
          }
        }
      };

      loadPreview();

      return () => {
        isCancelled = true;
        if (objectUrl && objectUrl.startsWith('blob:')) {
          URL.revokeObjectURL(objectUrl);
        }
      };
    } else {
      setObjectUrl(null);
      setTextContent(null);
      setLoadError(null);
    }
  }, [isOpen, document, isText]);

  if (!isOpen || !document) return null;

  const previewUrl = objectUrl || getPreviewUrl(document.id);

  const handleDownload = () => {
    const downloadUrl = getPreviewUrl(document.id).replace('/preview', '/download');
    const a = window.document.createElement('a');
    a.href = downloadUrl;
    a.download = document.originalName;
    a.click();
  };

  const handleOpenExternally = async () => {
    if (document.filePath) {
      await fileOrganizer.openDocumentFile(document.filePath);
    } else {
      handleDownload();
    }
  };

  return (
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal-container glass-card" onClick={(e) => e.stopPropagation()}>
        {/* Top Header Bar */}
        <div className="preview-modal-header">
          <div className="title-group">
            <FileText size={18} className="text-indigo" />
            <span className="doc-name">{document.originalName}</span>
          </div>

          <div className="header-actions">
            {fileOrganizer.isTauri && (
              <button
                className="btn-action btn-secondary-action"
                onClick={handleOpenExternally}
                title="Ouvrir avec l'application système par défaut"
              >
                <ExternalLink size={15} />
                <span>{t('viewer.openExternal', 'Ouvrir externement')}</span>
              </button>
            )}

            <button
              className={`btn-info ${showInfo ? 'active' : ''}`}
              onClick={() => setShowInfo(!showInfo)}
              title="Informations & Métadonnées"
            >
              <Info size={16} />
            </button>

            <button className="btn-action" onClick={handleDownload} title="Télécharger le fichier">
              <Download size={16} />
              <span>{t('viewer.download', 'Télécharger')}</span>
            </button>

            <button className="btn-close" onClick={onClose} title="Fermer (Échap)">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Viewport Content Area */}
        <div className="preview-modal-body">
          {loadError ? (
            <div className="unsupported-viewer">
              <FileText size={56} className="text-indigo mb-2" />
              <h3>Fichier non disponible pour prévisualisation directe</h3>
              <p>{loadError}</p>
              <div className="unsupported-actions">
                {fileOrganizer.isTauri && (
                  <button className="download-cta-btn secondary" onClick={handleOpenExternally}>
                    <ExternalLink size={18} />
                    <span>{t('viewer.openDefaultApp', "Ouvrir avec l'application par défaut")}</span>
                  </button>
                )}
                <button className="download-cta-btn" onClick={handleDownload}>
                  <Download size={18} />
                  <span>{t('viewer.downloadFile', 'Télécharger le fichier')}</span>
                </button>
              </div>
            </div>
          ) : isPdf ? (
            <PDFViewer previewUrl={previewUrl} title={document.originalName} onClose={onClose} />
          ) : isImage ? (
            <ImageViewer previewUrl={previewUrl} title={document.originalName} onClose={onClose} />
          ) : isText ? (
            <div className="text-preview-container">
              {loadingText ? (
                <div className="loading-spinner">Chargement du contenu texte...</div>
              ) : (
                <pre className="text-preview-content">{textContent}</pre>
              )}
            </div>
          ) : (
            <div className="unsupported-viewer">
              <FileText size={56} className="text-indigo mb-2" />
              <h3>{t('viewer.unsupportedTitle', 'Aperçu non disponible pour ce format')}</h3>
              <p>
                {t(
                  'viewer.unsupportedMsg',
                  `Le fichier "${document.originalName}" (${ext.toUpperCase()}) ne peut pas être prévisualisé directement.`
                )}
              </p>
              <div className="unsupported-actions">
                {fileOrganizer.isTauri && (
                  <button className="download-cta-btn secondary" onClick={handleOpenExternally}>
                    <ExternalLink size={18} />
                    <span>{t('viewer.openDefaultApp', "Ouvrir avec l'application par défaut")}</span>
                  </button>
                )}
                <button className="download-cta-btn" onClick={handleDownload}>
                  <Download size={18} />
                  <span>{t('viewer.downloadFile', 'Télécharger le fichier')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Slide-over Info Panel */}
          <DocumentInfoPanel document={document} isOpen={showInfo} onClose={() => setShowInfo(false)} />
        </div>
      </div>

      <style>{`
        .preview-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.88);
          backdrop-filter: blur(10px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 999;
          padding: 1rem;
        }

        .preview-modal-container {
          width: 100%;
          max-width: 1200px;
          height: 90vh;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
        }

        .preview-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.25rem;
          background: rgba(15, 23, 42, 0.95);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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
          color: #ffffff;
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
          color: #94a3b8;
          padding: 0.4rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
        }

        .btn-info.active {
          color: #818cf8;
          background: rgba(99, 102, 241, 0.2);
          border-color: rgba(99, 102, 241, 0.4);
        }

        .btn-action {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.85rem;
          border-radius: 6px;
          background: var(--gradient-primary, linear-gradient(135deg, #6366f1 0%, #a855f7 100%));
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 600;
          border: none;
          cursor: pointer;
        }

        .btn-secondary-action {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          color: #cbd5e1;
        }
        .btn-secondary-action:hover {
          background: rgba(255, 255, 255, 0.15);
          color: #ffffff;
        }

        .btn-close {
          color: #94a3b8;
          padding: 0.35rem;
          border-radius: 50%;
          background: none;
          border: none;
          cursor: pointer;
        }

        .btn-close:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.15);
        }

        .preview-modal-body {
          flex: 1;
          background: #090d16;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .text-preview-container {
          width: 100%;
          height: 100%;
          padding: 1.5rem;
          overflow-y: auto;
          background: #0b0f19;
          color: #e2e8f0;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
        }

        .text-preview-content {
          font-size: 0.85rem;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .unsupported-viewer {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          text-align: center;
          padding: 2.5rem;
        }

        .unsupported-viewer h3 {
          font-size: 1.25rem;
          color: #ffffff;
          font-weight: 700;
        }

        .unsupported-viewer p {
          font-size: 0.875rem;
          color: #94a3b8;
          max-width: 500px;
        }

        .unsupported-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }

        .download-cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.1rem;
          border-radius: 8px;
          background: var(--gradient-primary, linear-gradient(135deg, #6366f1 0%, #a855f7 100%));
          color: #ffffff;
          font-weight: 600;
          font-size: 0.85rem;
          border: none;
          cursor: pointer;
        }

        .download-cta-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .text-indigo { color: #818cf8; }
      `}</style>
    </div>
  );
};
