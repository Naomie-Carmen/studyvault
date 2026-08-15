import React, { useState, useEffect, useCallback } from 'react';
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
  FolderTree, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  GraduationCap, 
  ArrowRight,
  UploadCloud,
  Search,
  X,
  FileQuestion
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

  // Deleting Item State
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'UE' | 'ECUE' | 'Matière';
    id: string;
    name: string;
  } | null>(null);

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
      await structureService.deleteUE(deleteTarget.id);
      fetchTree();
    }
  };

  // ECUE Actions
  const handleSaveECUE = async (data: { ueId: string; title: string; code?: string }) => {
    if (editingECUE) {
      await structureService.updateECUE(editingECUE.id, data);
    } else {
      await structureService.createECUE(data);
    }
    fetchTree();
  };

  const handleConfirmDeleteECUE = async () => {
    if (deleteTarget && deleteTarget.type === 'ECUE') {
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
      await structureService.deleteSubject(deleteTarget.id);
      fetchTree();
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
      <div className="glass-card page-header-card">
        <div className="header-content">
          <div className="header-badge">
            <Sparkles size={14} />
            <span>Arborescence Pédagogique</span>
          </div>
          <h2>Maquette des Enseignements</h2>
          <p>
            Structurez vos cours par Semestre, Unités d'Enseignement (UE), ECUE et Matières.
          </p>
        </div>

        <div className="header-actions">
          <button
            className="refresh-btn import-btn"
            onClick={() => setIsImportOpen(true)}
            title="Importer une maquette (Excel/CSV)"
          >
            <UploadCloud size={16} />
            <span>Importer maquette (Excel/CSV)</span>
          </button>
          <button className="refresh-btn" onClick={fetchTree} disabled={loading} title="Rafraîchir">
            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            <span>Actualiser</span>
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
              title="Effacer la recherche"
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

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Tree View */}
      {loading ? (
        <div className="loading-card glass-card">
          <RefreshCw size={24} className="spinning text-indigo" />
          <p>Chargement de la structure académique...</p>
        </div>
      ) : debouncedSearchQuery.trim() !== '' && matchCount === 0 ? (
        <div className="glass-card no-search-results-card">
          <FileQuestion size={40} className="text-muted" />
          <h3>{t('structure.noResults', 'Aucun résultat pour')} « {debouncedSearchQuery} »</h3>
          <p>Vérifiez l'orthographe ou essayez un autre terme (ex: code UE, matière, nom d'enseignant).</p>
        </div>
      ) : tree && Array.isArray(tree.semesters) && tree.semesters.length > 0 ? (
        <TreeView
          semesters={tree.semesters}
          searchQuery={debouncedSearchQuery}
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
      ) : (
        <div className="glass-card empty-tree-card">
          <FolderTree size={40} className="text-indigo" />
          <h3>Aucune structure définie</h3>
          <p>Ajoutez votre première Unité d'Enseignement (UE) dans l'un de vos semestres pour démarrer.</p>
        </div>
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

      {/* Delete Confirmation Modal */}
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

      {/* Maquette Import Modal */}
      <MaquetteImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={() => {
          setIsImportOpen(false);
          fetchTree();
        }}
      />

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

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
