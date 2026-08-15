import React from 'react';
import { AlertTriangle, Trash2, X, RefreshCw } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  itemName?: string;
  itemType?: string;
  message?: string;
  confirmButtonText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType = 'élément',
  message,
  confirmButtonText,
}) => {
  const [loading, setLoading] = React.useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card modal-card danger-card">
        <div className="modal-header">
          <div className="title-group text-error">
            <AlertTriangle size={22} />
            <h3>{title}</h3>
          </div>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {message ? (
            <p className="warning-text-primary">{message}</p>
          ) : (
            <>
              <p>
                Êtes-vous sûr de vouloir supprimer cet(te) {itemType} :
              </p>
              {itemName && <div className="item-highlight">{itemName}</div>}
              <p className="warning-text">
                ⚠️ Cette action supprimera définitivement cet élément et tous ses sous-éléments rattachés.
              </p>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onClose} disabled={loading}>
            Annuler
          </button>
          <button className="btn-delete" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <RefreshCw size={16} className="spinning" />
            ) : (
              <Trash2 size={16} />
            )}
            <span>{loading ? 'Suppression...' : confirmButtonText || 'Supprimer Définitivement'}</span>
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 110;
          padding: 1rem;
        }

        .danger-card {
          width: 100%;
          max-width: 460px;
          padding: 1.75rem;
          background: var(--bg-secondary);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .text-error { color: var(--status-error); }

        .modal-body p {
          font-size: 0.9rem;
          color: var(--text-secondary);
        }

        .warning-text-primary {
          font-size: 0.95rem !important;
          color: var(--text-primary) !important;
          font-weight: 600;
          line-height: 1.5;
        }

        .item-highlight {
          margin: 0.75rem 0;
          padding: 0.6rem 0.875rem;
          border-radius: var(--radius-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: var(--text-primary);
          font-weight: 600;
          font-size: 0.9rem;
        }

        .warning-text {
          font-size: 0.775rem !important;
          color: var(--status-warning) !important;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1.25rem;
        }

        .btn-cancel {
          padding: 0.6rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .btn-delete {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.6rem 1.15rem;
          border-radius: var(--radius-md);
          background: var(--status-error);
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .close-btn { color: var(--text-muted); }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
