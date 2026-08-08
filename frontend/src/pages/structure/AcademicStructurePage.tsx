import React, { useState, useEffect, useCallback } from 'react';
import { AcademicStructureTree, UE, ECUE, Subject } from '../../types/structure';
import * as structureService from '../../services/academicStructureService';
import { TreeView } from '../../components/structure/TreeView';
import { UEModal } from '../../components/structure/UEModal';
import { ECUEModal } from '../../components/structure/ECUEModal';
import { SubjectModal } from '../../components/structure/SubjectModal';
import { DeleteConfirmModal } from '../../components/structure/DeleteConfirmModal';
import { useAcademic } from '../../context/useAcademic';
import { 
  FolderTree, 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  GraduationCap, 
  ArrowRight
} from 'lucide-react';
import { SubjectInput } from '../../types/validators';

interface AcademicStructurePageProps {
  onNavigateAcademicProfile?: () => void;
}

export const AcademicStructurePage: React.FC<AcademicStructurePageProps> = ({
  onNavigateAcademicProfile,
}) => {
  const { hasConfiguredProfile } = useAcademic();
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal States
  const [activeSemesterId, setActiveSemesterId] = useState<string | null>(null);
  const [activeUEId, setActiveUEId] = useState<string | null>(null);
  const [activeECUEId, setActiveECUEId] = useState<string | null>(null);

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
            <span>Arborescence Pédagogique (Phase 4)</span>
          </div>
          <h2>Maquette des Enseignements</h2>
          <p>
            Structurez vos cours par Semestre, Unités d'Enseignement (UE), ECUE et Matières.
          </p>
        </div>

        <button className="refresh-btn" onClick={fetchTree} disabled={loading} title="Rafraîchir">
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
          <span>Actualiser</span>
        </button>
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
      ) : tree && tree.semesters.length > 0 ? (
        <TreeView
          semesters={tree.semesters}
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
        }

        .refresh-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
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
