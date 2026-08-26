import React, { useState, useEffect } from 'react';
import { X, HardDrive, Cloud, Check, FolderOpen } from 'lucide-react';
import * as docService from '../../services/documentService';
import * as fileOrganizer from '../../services/fileOrganizer';

interface StorageSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (storageType: 'local' | 'cloud', remember: boolean) => void;
}

export const StorageSelectionModal: React.FC<StorageSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [cloudEnabled, setCloudEnabled] = useState(false);
  const [selectedStorage, setSelectedStorage] = useState<'local' | 'cloud'>('local');
  const [remember, setRemember] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>('');

  const loadRootPath = () => {
    fileOrganizer.getRootPath().then((path) => {
      if (path) setCurrentPath(path);
    });
  };

  useEffect(() => {
    if (isOpen) {
      loadRootPath();
      docService.getCloudStatus().then((res) => {
        if (res.success && res.data) {
          setCloudEnabled(res.data.enabled);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePickCustomFolder = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPath = await fileOrganizer.pickCustomRootFolder();
    if (newPath) {
      setCurrentPath(newPath);
    }
  };

  const handleProceed = () => {
    onConfirm(selectedStorage, remember);
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="glass-card storage-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Choisir l'emplacement de stockage</h3>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="storage-modal-body">
          <p className="subtitle">
            Où souhaitez-vous créer et conserver vos dossiers de cours pour cette ECUE ?
          </p>

          <div className="storage-options-grid">
            {/* Local Option */}
            <div
              className={`storage-option-card ${selectedStorage === 'local' ? 'active' : ''}`}
              onClick={() => setSelectedStorage('local')}
            >
              <div className="option-icon text-indigo">
                <HardDrive size={24} />
              </div>
              <div className="option-info">
                <h4>💻 Ce PC (Stockage Local)</h4>
                <p>Vos dossiers et fichiers sont créés localement sur votre ordinateur.</p>
                {currentPath && (
                  <div className="current-path-badge">
                    <span>📁 {currentPath}</span>
                  </div>
                )}
                {fileOrganizer.isTauri && (
                  <button
                    type="button"
                    className="btn-pick-custom-dir"
                    onClick={handlePickCustomFolder}
                    title="Choisir un autre dossier personnalisé sur votre ordinateur"
                  >
                    <FolderOpen size={12} />
                    <span>Choisir un autre emplacement...</span>
                  </button>
                )}
              </div>
              {selectedStorage === 'local' && (
                <div className="check-badge">
                  <Check size={14} />
                </div>
              )}
            </div>

            {/* Cloud Option */}
            <div
              className={`storage-option-card ${!cloudEnabled ? 'disabled' : selectedStorage === 'cloud' ? 'active' : ''}`}
              onClick={() => {
                if (cloudEnabled) setSelectedStorage('cloud');
              }}
            >
              <div className="option-icon text-purple">
                <Cloud size={24} />
              </div>
              <div className="option-info">
                <div className="title-row">
                  <h4>☁️ Stockage Cloud</h4>
                  {!cloudEnabled && <span className="soon-badge">Bientôt</span>}
                </div>
                <p>
                  {cloudEnabled
                    ? 'Synchronisez vos documents en ligne sur Cloudflare R2.'
                    : 'Le stockage Cloud sera activé dès la configuration R2.'}
                </p>
              </div>
              {selectedStorage === 'cloud' && cloudEnabled && (
                <div className="check-badge">
                  <Check size={14} />
                </div>
              )}
            </div>
          </div>

          <label className="remember-checkbox-label">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Se souvenir de mon choix pour les prochains ajouts</span>
          </label>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Annuler
          </button>

          <button className="btn-save" onClick={handleProceed}>
            Continuer
          </button>
        </div>
      </div>

      <style>{`
        .storage-modal-card {
          width: 100%;
          max-width: 520px;
          padding: 1.5rem;
        }

        .subtitle {
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: 1.25rem;
        }

        .storage-options-grid {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.25rem;
        }

        .storage-option-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.5);
          border: 2px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          position: relative;
          transition: all 0.2s ease;
        }

        .storage-option-card:hover:not(.disabled) {
          border-color: rgba(99, 102, 241, 0.4);
          background: rgba(30, 41, 59, 0.8);
        }

        .storage-option-card.active {
          border-color: #6366f1;
          background: rgba(99, 102, 241, 0.12);
        }

        .storage-option-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(0.4);
        }

        .option-info {
          flex: 1;
        }

        .option-info h4 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 0.25rem;
          color: var(--text-primary);
        }

        .option-info p {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .current-path-badge {
          margin-top: 0.35rem;
          padding: 0.25rem 0.5rem;
          border-radius: 6px;
          background: rgba(99, 102, 241, 0.15);
          border: 1px solid rgba(99, 102, 241, 0.3);
          font-size: 0.72rem;
          color: #818cf8;
          font-weight: 600;
          word-break: break-all;
        }

        .btn-pick-custom-dir {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          margin-top: 0.4rem;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.08);
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-pick-custom-dir:hover {
          background: rgba(99, 102, 241, 0.3);
          border-color: #6366f1;
        }

        .title-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .soon-badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.15rem 0.45rem;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
          text-transform: uppercase;
        }

        .check-badge {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #6366f1;
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .remember-checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          cursor: pointer;
          user-select: none;
        }
      `}</style>
    </div>
  );
};
