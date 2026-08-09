import React, { useState, useEffect, useCallback } from 'react';
import { DocumentItem } from '../../types/document';
import * as docService from '../../services/documentService';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  FileText, 
  Sparkles, 
  RefreshCw,
  CheckCircle2
} from 'lucide-react';

export const TrashPage: React.FC = () => {
  const [trashItems, setTrashItems] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await docService.getTrash();
      if (res.success && Array.isArray(res.data)) setTrashItems(res.data);
    } catch (err) {
      console.error('Error fetching trash items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (id: string) => {
    const res = await docService.restoreDocument(id);
    if (res.success) {
      setSuccessMsg('Document restauré avec succès dans sa matière d\'origine.');
      fetchTrash();
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const res = await docService.permanentlyDeleteDocument(id);
    if (res.success) {
      setSuccessMsg('Document supprimé définitivement du serveur.');
      fetchTrash();
    }
  };

  const handleEmptyTrash = async () => {
    const res = await docService.emptyTrash();
    setShowEmptyConfirm(false);
    if (res.success) {
      setSuccessMsg(res.data?.message || 'Corbeille vidée avec succès.');
      fetchTrash();
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="trash-page">
      {/* Header Banner */}
      <div className="glass-card page-header trash-header">
        <div className="header-info">
          <div className="header-badge trash-badge">
            <Trash2 size={14} />
            <span>Gestion des Fichiers Supprimés</span>
          </div>
          <h2>Corbeille Documentaire</h2>
          <p>
            Les documents supprimés restent en corbeille et peuvent être restaurés à tout moment.
          </p>
        </div>

        {trashItems.length > 0 && (
          <button className="btn-empty-trash" onClick={() => setShowEmptyConfirm(true)}>
            <Trash2 size={16} />
            <span>Vider la Corbeille</span>
          </button>
        )}
      </div>

      {/* Info Warning Banner */}
      <div className="glass-card info-banner">
        <AlertTriangle size={18} className="text-warning" />
        <span>
          Les fichiers placés en corbeille conservent leur emplacement d'origine et sont purgés après un délai de rétention de 30 jours.
        </span>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Trash List */}
      {loading ? (
        <div className="glass-card empty-card">
          <RefreshCw size={24} className="spinning text-indigo" />
          <p>Chargement de la corbeille...</p>
        </div>
      ) : trashItems.length > 0 ? (
        <div className="glass-card trash-table-card">
          <div className="trash-table">
            <div className="table-header">
              <span>Nom du Document</span>
              <span>Type / Taille</span>
              <span>Date de suppression</span>
              <span>Actions</span>
            </div>

            {trashItems.map((doc) => (
              <div key={doc.id} className="table-row">
                <div className="doc-name-col">
                  <FileText size={18} className="text-muted" />
                  <span className="file-name" title={doc.originalName}>
                    {doc.originalName}
                  </span>
                </div>

                <div className="doc-meta-col">
                  <span className="doc-type-pill">{doc.docType.toUpperCase()}</span>
                  <span className="file-size">{formatSize(doc.fileSize)}</span>
                </div>

                <div className="doc-date-col">
                  {formatDate(doc.deletedAt)}
                </div>

                <div className="doc-actions-col">
                  <button
                    className="btn-restore"
                    onClick={() => handleRestore(doc.id)}
                    title="Restaurer ce document"
                  >
                    <RotateCcw size={14} />
                    <span>Restaurer</span>
                  </button>

                  <button
                    className="btn-delete-perm"
                    onClick={() => handlePermanentDelete(doc.id)}
                    title="Supprimer définitivement"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="glass-card empty-card">
          <Sparkles size={40} className="text-indigo" />
          <h3>La corbeille est vide</h3>
          <p>Aucun document supprimé n'est actuellement en attente dans la corbeille.</p>
        </div>
      )}

      {/* Modal Confirmation Empty Trash */}
      {showEmptyConfirm && (
        <div className="modal-backdrop">
          <div className="glass-card modal-card">
            <div className="modal-header">
              <AlertTriangle size={24} className="text-error" />
              <h3>Vider définitivement la corbeille</h3>
            </div>
            <p className="modal-text">
              Êtes-vous sûr de vouloir vider intégralement la corbeille ? Tous les {trashItems.length} fichier(s) seront supprimés définitivement du disque sans possibilité de restauration.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowEmptyConfirm(false)}>
                Annuler
              </button>
              <button className="btn-danger-confirm" onClick={handleEmptyTrash}>
                Vider la corbeille
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .trash-page {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .trash-header {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(245, 158, 11, 0.1) 100%);
          border-color: rgba(239, 68, 68, 0.25);
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .trash-badge {
          background: rgba(239, 68, 68, 0.15);
          color: var(--status-error);
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          font-size: 0.725rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }

        .header-info h2 { font-size: 1.4rem; margin-bottom: 0.2rem; }
        .header-info p { font-size: 0.85rem; color: var(--text-muted); }

        .btn-empty-trash {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.6rem 1.15rem;
          border-radius: var(--radius-md);
          background: var(--status-error);
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .info-banner {
          padding: 0.75rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--text-secondary);
          background: rgba(245, 158, 11, 0.08);
          border: 1px solid rgba(245, 158, 11, 0.25);
        }

        .alert-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.875rem;
          border-radius: var(--radius-md);
          background: var(--status-success-bg);
          color: var(--status-success);
          font-size: 0.85rem;
        }

        .trash-table-card {
          padding: 0;
          overflow: hidden;
        }

        .trash-table {
          display: flex;
          flex-direction: column;
        }

        .table-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          padding: 0.75rem 1.25rem;
          background: rgba(0, 0, 0, 0.2);
          border-bottom: 1px solid var(--border-color);
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .table-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          align-items: center;
          padding: 0.85rem 1.25rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
          font-size: 0.85rem;
        }

        .table-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }

        .doc-name-col {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          min-width: 0;
        }

        .file-name {
          font-weight: 600;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .doc-meta-col {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .doc-type-pill {
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.65rem;
          font-weight: 700;
        }

        .file-size { color: var(--text-muted); font-size: 0.775rem; }

        .doc-date-col { color: var(--text-muted); font-size: 0.8rem; }

        .doc-actions-col {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-restore {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-sm);
          background: rgba(16, 185, 129, 0.15);
          color: var(--status-success);
          font-size: 0.775rem;
          font-weight: 600;
        }

        .btn-delete-perm {
          color: var(--text-muted);
          padding: 0.35rem;
          border-radius: var(--radius-sm);
        }

        .btn-delete-perm:hover {
          color: var(--status-error);
          background: rgba(239, 68, 68, 0.1);
        }

        .empty-card {
          padding: 3.5rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
          display: flex; align-items: center; justify-content: center; z-index: 100; padding: 1rem;
        }
        .modal-card { width: 100%; max-width: 440px; padding: 1.75rem; display: flex; flex-direction: column; gap: 1rem; }
        .modal-header { display: flex; align-items: center; gap: 0.5rem; }
        .modal-text { font-size: 0.875rem; color: var(--text-secondary); }
        .modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
        .btn-cancel { padding: 0.55rem 1rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.85rem; }
        .btn-danger-confirm { padding: 0.55rem 1.15rem; border-radius: var(--radius-md); background: var(--status-error); color: #ffffff; font-size: 0.85rem; font-weight: 600; }

        .text-warning { color: var(--status-warning); }
        .text-indigo { color: var(--primary); }
        .text-muted { color: var(--text-muted); }
        .text-error { color: var(--status-error); }
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
