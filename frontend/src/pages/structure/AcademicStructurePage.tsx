import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AcademicStructureTree, UE, ECUE, Subject } from '../../types/structure';
import * as structureService from '../../services/academicStructureService';
import { TreeView, matchSearch } from '../../components/structure/TreeView';
import { UEModal } from '../../components/structure/UEModal';
import { ECUEModal } from '../../components/structure/ECUEModal';
import { SubjectModal } from '../../components/structure/SubjectModal';
import { DeleteConfirmModal } from '../../components/structure/DeleteConfirmModal';
import { MaquetteImportModal } from '../../components/structure/MaquetteImportModal';
import { useAcademic } from '../../context/useAcademic';
import { 
  RefreshCw, 
  AlertCircle, 
  GraduationCap, 
  ArrowRight,
  UploadCloud,
  Search,
  X,
  FileQuestion,
  Trash2,
  CheckCircle2,
  RotateCcw
} from 'lucide-react';

import { SubjectInput } from '../../types/validators';

interface AcademicStructurePageProps {
  onNavigateAcademicProfile?: () => void;
}

export const AcademicStructurePage: React.FC<AcademicStructurePageProps> = ({
  onNavigateAcademicProfile,
}) => {
  const { t } = useTranslation();
  const { hasConfiguredProfile } = useAcademic();
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search State with 300ms Debounce
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Modal States
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [activeUEId, setActiveUEId] = useState<string | null>(null);
  const [activeECUEId, setActiveECUEId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Editing Item States
  const [editingUE, setEditingUE] = useState<UE | null>(null);
  const [editingECUE, setEditingECUE] = useState<ECUE | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Delete All State
  const [isDeleteAllModalOpen, setIsDeleteAllModalOpen] = useState(false);
  const [deletingAll, setDeletingAll] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Deleting Item State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'UE' | 'ECUE' | 'Matière';
    id: string;
    name: string;
  } | null>(null);

  // Undo Toast State
  const [undoSnapshot, setUndoSnapshot] = useState<AcademicStructureTree | null>(null);
  const [undoToast, setUndoToast] = useState<{ visible: boolean; type: 'delete' | 'success'; message: string } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerDeleteToast = (snapshot: AcademicStructureTree) => {
    setUndoSnapshot(snapshot);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast({
      visible: true,
      type: 'delete',
      message: t('structure.deleteDone', '🗑️ Suppression effectuée'),
    });

    undoTimerRef.current = setTimeout(() => {
      setUndoToast(null);
      setUndoSnapshot(null);
    }, 8000);
  };

  const handleUndoDelete = async () => {
    if (!undoSnapshot) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

    try {
      const res = await structureService.restoreStructure(undoSnapshot);
      if (res.success) {
        setUndoToast({
          visible: true,
          type: 'success',
          message: t('structure.actionUndone', '✅ Action annulée'),
        });
        fetchTree();
        undoTimerRef.current = setTimeout(() => {
          setUndoToast(null);
          setUndoSnapshot(null);
        }, 4000);
      } else {
        setError(res.error?.message || 'Erreur lors de la restauration.');
      }
    } catch (_err) {
      setError('Erreur de connexion lors de l\'annulation.');
    }
  };

  const fetchTree = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await structureService.getStructureTree();
      if (res.success && res.data) {
        setTree(res.data);
      } else {
        setError(res.error?.message || 'Impossible de charger l\'arborescence.');
      }
    } catch (_err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTree();
  }, [fetchTree]);

  // Compute total match count across the tree
  const matchCount = React.useMemo(() => {
    const q = debouncedSearchQuery.trim();
    if (!q || !tree || !Array.isArray(tree.semesters)) return 0;
    let count = 0;
    tree.semesters.forEach((sem) => {
      sem.ues.forEach((ue) => {
        if (matchSearch(ue.code, q) || matchSearch(ue.title, q)) {
          count++;
        }
        ue.ecues.forEach((ecue) => {
          if (matchSearch(ecue.code, q) || matchSearch(ecue.title, q)) {
            count++;
          }
          ecue.subjects.forEach((sub) => {
            if (matchSearch(sub.name, q) || (sub.instructor && matchSearch(sub.instructor, q))) {
              count++;
            }
          });
        });
        ue.directSubjects.forEach((sub) => {
          if (matchSearch(sub.name, q) || (sub.instructor && matchSearch(sub.instructor, q))) {
            count++;
          }
        });
      });
    });
    return count;
  }, [debouncedSearchQuery, tree]);

  // UE Actions
  const handleSaveUE = async (data: { semesterId: string; title: string; code?: string; ects?: number }) => {
    if (editingUE) {
      await structureService.updateUE(editingUE.id, data);
    } else {
      await structureService.createUE(data);
    }
    fetchTree();
  };

  const handleConfirmDeleteUE = async () => {
    if (deleteTarget && deleteTarget.type === 'UE') {
      if (tree) triggerDeleteToast(JSON.parse(JSON.stringify(tree)));
      await structureService.deleteUE(deleteTarget.id);
      fetchTree();
    }
  };

  // ECUE Actions
  const handleSaveECUE = async (data: { ueId: string; title: string; code?: string; ects?: number }) => {
    if (editingECUE) {
      await structureService.updateECUE(editingECUE.id, data);
    } else {
      await structureService.createECUE(data);
    }
    fetchTree();
  };

  const handleConfirmDeleteECUE = async () => {
    if (deleteTarget && deleteTarget.type === 'ECUE') {
      if (tree) triggerDeleteToast(JSON.parse(JSON.stringify(tree)));
      await structureService.deleteECUE(deleteTarget.id);
      fetchTree();
    }
  };

  // Subject Actions
  const handleSaveSubject = async (data: { ueId?: string; ecueId?: string; name: string; instructor?: string; color?: string }) => {
    if (editingSubject) {
      await structureService.updateSubject(editingSubject.id, data);
    } else {
      await structureService.createSubject(data as SubjectInput);
    }
    fetchTree();
  };

  const handleConfirmDeleteSubject = async () => {
    if (deleteTarget && deleteTarget.type === 'Matière') {
      if (tree) triggerDeleteToast(JSON.parse(JSON.stringify(tree)));
      await structureService.deleteSubject(deleteTarget.id);
      fetchTree();
    }
  };

  const handleConfirmDeleteAll = async () => {
    if (tree) triggerDeleteToast(JSON.parse(JSON.stringify(tree)));
    setDeletingAll(true);
    try {
      const res = await structureService.deleteAllStructure();
      if (res.success) {
        setIsDeleteAllModalOpen(false);
        setSuccessMessage(t('structure.resetSuccess', 'Arborescence réinitialisée. Importez votre maquette ou ajoutez vos UE manuellement.'));
        setTimeout(() => setSuccessMessage(null), 6000);
        fetchTree();
      } else {
        setError(res.error?.message || 'Erreur lors de la réinitialisation.');
      }
    } catch (_err) {
      setError('Erreur de connexion au serveur.');
    } finally {
      setDeletingAll(false);
    }
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'UE') await handleConfirmDeleteUE();
    if (deleteTarget.type === 'ECUE') await handleConfirmDeleteECUE();
    if (deleteTarget.type === 'Matière') await handleConfirmDeleteSubject();
  };

  if (!hasConfiguredProfile) {
    return (
      <div className="academic-structure-container">
        <div className="glass-card unconfigured-card">
          <GraduationCap size={48} className="text-indigo" />
          <h2>Profil Universitaire non configuré</h2>
          <p>
            Veuillez d'abord renseigner votre université et vos semestres dans votre profil avant de construire votre arborescence de cours.
          </p>
          {onNavigateAcademicProfile && (
            <button className="cta-btn" onClick={onNavigateAcademicProfile}>
              <span>Configurer mon Profil Universitaire</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>
        <style>{`
          .academic-structure-container { max-width: 900px; margin: 2rem auto; }
          .unconfigured-card { padding: 3rem 2rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1rem; }
          .unconfigured-card h2 { font-size: 1.5rem; }
          .unconfigured-card p { color: var(--text-muted); max-width: 500px; font-size: 0.9rem; }
          .cta-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.85rem 1.5rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-weight: 600; font-size: 0.9rem; }
          .text-indigo { color: var(--primary); }
        `}</style>
      </div>
    );
  }

  return (
    <div className="academic-structure-container">
      {/* Header Banner */}
      <div className="page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="page-header-icon">
            <GraduationCap size={24} />
          </div>
          <div className="header-title-box">
            <h1>{t('structure.pageTitle', 'Maquette des Enseignements')}</h1>
            <p className="subtitle">
              {t('structure.pageSubtitle', 'Structurez vos cours par Semestre, Unités d\'Enseignement (UE), ECUE et Matières.')}
            </p>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tree && Array.isArray(tree.semesters) && tree.semesters.some(s => s.ues.length > 0) && (
            <button
              className="refresh-btn delete-all-btn"
              onClick={() => setIsDeleteAllModalOpen(true)}
              title={t('structure.deleteAllTitle', 'Tout supprimer pour repartir de zéro')}
            >
              <Trash2 size={16} />
              <span>{t('structure.deleteAllBtn', 'Tout supprimer')}</span>
            </button>
          )}
          <button
            className="refresh-btn import-btn"
            onClick={() => setIsImportOpen(true)}
            title={t('structure.importTitle', 'Importer une maquette (Excel/CSV)')}
          >
            <UploadCloud size={16} />
            <span>{t('structure.importBtn', 'Importer maquette (Excel/CSV)')}</span>
          </button>
          <button className="refresh-btn" onClick={fetchTree} disabled={loading} title={t('structure.refreshTitle', 'Rafraîchir')}>
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            <span>{t('structure.refreshBtn', 'Actualiser')}</span>
          </button>
        </div>
      </div>

      {/* Instant Search Bar */}
      <div className="structure-search-container">
        <div className="structure-search-box glass-card">
          <Search size={18} className="search-icon text-indigo" />
          <input
            type="text"
            placeholder={t('structure.searchPlaceholder', 'Rechercher une UE, ECUE, enseignant...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="structure-search-input"
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => setSearchQuery('')}
              title={t('common.clearSearch', 'Effacer la recherche')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {debouncedSearchQuery.trim() !== '' && (
          <div className="search-counter-tag">
            {matchCount}{' '}
            {matchCount <= 1
              ? t('structure.resultFound', 'résultat trouvé')
              : t('structure.resultsFound', 'résultats trouvés')}
          </div>
        )}
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Tree View */}
      {loading || deletingAll ? (
        <div className="loading-card glass-card">
          <RefreshCw size={24} className="spinning text-indigo" />
          <p>{deletingAll ? t('structure.deletingAll', 'Suppression de toute l\'arborescence…') : t('structure.loadingTree', 'Chargement de la structure académique...')}</p>
        </div>
      ) : debouncedSearchQuery.trim() !== '' && matchCount === 0 ? (
        <div className="glass-card no-search-results-card">
          <FileQuestion size={40} className="text-muted" />
          <h3>{t('structure.noResults', 'Aucun résultat pour')} « {debouncedSearchQuery} »</h3>
          <p>{t('structure.noResultsHelp', 'Vérifiez l\'orthographe ou essayez un autre terme (ex: code UE, matière, nom d\'enseignant).')}</p>
        </div>
      ) : (
        <TreeView
          semesters={tree?.semesters || []}
          searchQuery={debouncedSearchQuery}
          onReorder={async (data) => {
            try {
              const res = await structureService.reorderStructure(data);
              if (res.success) {
                fetchTree();
              }
            } catch (_err) {
              setError('Erreur lors de la réorganisation.');
            }
          }}
          onAddUE={(semesterId) => {
            setActiveSemesterId(semesterId);
            setEditingUE(null);
          }}
          onEditUE={(ue) => {
            setActiveSemesterId(ue.semesterId);
            setEditingUE(ue);
          }}
          onDeleteUE={(ue) => setDeleteTarget({ type: 'UE', id: ue.id, name: `${ue.code ? ue.code + ' — ' : ''}${ue.title}` })}
          onAddECUE={(ueId) => {
            setActiveUEId(ueId);
            setEditingECUE(null);
          }}
          onEditECUE={(ecue) => {
            setActiveUEId(ecue.ueId);
            setEditingECUE(ecue);
          }}
          onDeleteECUE={(ecue) => setDeleteTarget({ type: 'ECUE', id: ecue.id, name: `${ecue.code ? ecue.code + ' — ' : ''}${ecue.title}` })}
          onAddSubject={({ ueId, ecueId }) => {
            setActiveUEId(ueId || null);
            setActiveECUEId(ecueId || null);
            setEditingSubject(null);
          }}
          onEditSubject={(sub) => {
            setActiveUEId(sub.ueId || null);
            setActiveECUEId(sub.ecueId || null);
            setEditingSubject(sub);
          }}
          onDeleteSubject={(sub) => setDeleteTarget({ type: 'Matière', id: sub.id, name: sub.name })}
        />
      )}

      {/* UE Modal */}
      {activeSemesterId && (
        <UEModal
          isOpen={!!activeSemesterId}
          onClose={() => {
            setActiveSemesterId(null);
            setEditingUE(null);
          }}
          onSubmit={handleSaveUE}
          semesterId={activeSemesterId}
          editUE={editingUE}
        />
      )}

      {/* ECUE Modal */}
      {activeUEId && !editingSubject && (
        <ECUEModal
          isOpen={!!activeUEId && !editingSubject}
          onClose={() => {
            setActiveUEId(null);
            setEditingECUE(null);
          }}
          onSubmit={handleSaveECUE}
          ueId={activeUEId}
          editECUE={editingECUE}
        />
      )}

      {/* Subject Modal */}
      {(activeUEId || activeECUEId || editingSubject) && (
        <SubjectModal
          isOpen={!!(activeUEId || activeECUEId || editingSubject)}
          onClose={() => {
            setActiveUEId(null);
            setActiveECUEId(null);
            setEditingSubject(null);
          }}
          onSubmit={handleSaveSubject}
          ueId={activeUEId || undefined}
          ecueId={activeECUEId || undefined}
          editSubject={editingSubject}
        />
      )}

      {/* Delete Single Item Confirmation Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={executeDelete}
          title={deleteTarget.name}
          itemName={deleteTarget.name}
          itemType={deleteTarget.type}
        />
      )}

      {/* Delete All Confirmation Modal */}
      {isDeleteAllModalOpen && (
        <DeleteConfirmModal
          isOpen={isDeleteAllModalOpen}
          onClose={() => setIsDeleteAllModalOpen(false)}
          onConfirm={handleConfirmDeleteAll}
          title="Réinitialiser l'arborescence"
          message="⚠️ Cette action supprimera TOUS vos semestres, UE et ECUE. Voulez-vous continuer ?"
          confirmButtonText="Supprimer tout"
        />
      )}

      {/* Maquette Import Modal */}
      <MaquetteImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          fetchTree();
        }}
      />

      {/* Floating Undo Toast */}
      {undoToast?.visible && (
        <div className={`undo-toast-card glass-card ${undoToast.type}`}>
          <span>{undoToast.message}</span>
          {undoToast.type === 'delete' && (
            <button type="button" className="btn-undo-action" onClick={handleUndoDelete}>
              <RotateCcw size={14} />
              <span>{t('structure.undoBtn', 'Annuler')}</span>
            </button>
          )}
        </div>
      )}

      <style>{`
        .academic-structure-container {
          max-width: 900px;
          margin: 1rem auto;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .page-header-card {
          padding: 1.5rem 1.75rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
          border-color: rgba(99, 102, 241, 0.25);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .header-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.55rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          font-size: 0.725rem;
          font-weight: 600;
          margin-bottom: 0.35rem;
        }

        .header-content h2 {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .header-content p {
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .structure-search-container {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .structure-search-box {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 12px 16px;
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid var(--border-color);
          width: 100%;
          max-width: 600px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
          transition: border-color 0.2s ease;
        }

        .structure-search-box:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
        }

        .structure-search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.95rem;
          outline: none;
        }

        .search-clear-btn {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          color: var(--text-muted);
          border-radius: 50%;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .search-clear-btn:hover {
          background: rgba(239, 68, 68, 0.2);
          color: #f87171;
        }

        .search-counter-tag {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-left: 0.5rem;
          font-weight: 500;
        }

        .no-search-results-card {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          color: var(--text-muted);
        }

        .refresh-btn {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.875rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          border: 1px solid var(--border-color);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .refresh-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .delete-all-btn {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border-color: rgba(239, 68, 68, 0.3);
        }

        .delete-all-btn:hover {
          background: rgba(239, 68, 68, 0.25);
          color: #ffffff;
        }

        .import-btn {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          border-color: rgba(99, 102, 241, 0.3);
        }

        .import-btn:hover {
          background: rgba(99, 102, 241, 0.25);
          color: #ffffff;
        }

        .alert-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          background: var(--status-error-bg);
          color: var(--status-error);
          font-size: 0.85rem;
        }

        .alert-success {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 0.85rem;
        }

        .loading-card,
        .empty-tree-card {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .undo-toast-card {
          position: fixed;
          bottom: 1.75rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.25rem;
          border-radius: 999px;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          border: 1px solid var(--border-color);
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          font-size: 0.9rem;
          font-weight: 600;
          color: #ffffff;
        }

        .undo-toast-card.success {
          border-color: rgba(16, 185, 129, 0.4);
          background: rgba(6, 78, 59, 0.85);
          color: #34d399;
        }

        .btn-undo-action {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 999px;
          background: rgba(99, 102, 241, 0.25);
          border: 1px solid #818cf8;
          color: #a5b4fc;
          font-size: 0.825rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .btn-undo-action:hover {
          background: #6366f1;
          color: #ffffff;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
