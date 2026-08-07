import React, { useState, useEffect } from 'react';
import { DocumentItem } from '../../types/document';
import { ClassificationSuggestion } from '../../types/classification';
import { AcademicStructureTree } from '../../types/structure';
import * as classificationService from '../../services/classificationService';
import * as structureService from '../../services/academicStructureService';
import { X, Sparkles, Check, Edit3, XCircle, FileText, Layers, AlertCircle } from 'lucide-react';

interface ClassificationModalProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ClassificationModal: React.FC<ClassificationModalProps> = ({
  document,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [suggestion, setSuggestion] = useState<ClassificationSuggestion | null>(null);
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('cours');

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && document) {
      Promise.all([
        classificationService.getClassification(document.id),
        structureService.getStructureTree(),
      ]).then(([suggRes, treeRes]) => {
        if (suggRes.success && suggRes.data) {
          setSuggestion(suggRes.data);
          setSelectedSubjectId(suggRes.data.proposedSubjectId || '');
          setSelectedDocType(suggRes.data.proposedDocType || 'cours');
        }
        if (treeRes.success && treeRes.data) setTree(treeRes.data);
      });
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  // Flatten all subjects for modification picker
  const allSubjects: { id: string; name: string }[] = [];
  if (tree) {
    tree.semesters.forEach((sem) => {
      sem.ues.forEach((ue) => {
        ue.directSubjects.forEach((sub) => allSubjects.push(sub));
        ue.ecues.forEach((ecue) => {
          ecue.subjects.forEach((sub) => allSubjects.push(sub));
        });
      });
    });
  }

  const handleAccept = async () => {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await classificationService.acceptClassification(document.id);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Échec de la validation.');
      }
    } catch (_e) {
      setErrorMsg('Erreur lors du classement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleModify = async () => {
    if (!selectedSubjectId) {
      setErrorMsg('Veuillez sélectionner une matière d\'accueil.');
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await classificationService.modifyClassification(document.id, selectedSubjectId, selectedDocType);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Échec de la modification.');
      }
    } catch (_e) {
      setErrorMsg('Erreur lors du classement.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    try {
      await classificationService.rejectClassification(document.id);
      onSuccess();
      onClose();
    } catch (_e) {
      /* ignore */
    }
  };

  const confidenceClass =
    suggestion && suggestion.confidenceScore >= 80
      ? 'high'
      : suggestion && suggestion.confidenceScore >= 50
      ? 'medium'
      : 'low';

  return (
    <div className="modal-backdrop">
      <div className="glass-card classification-modal-card">
        <div className="modal-header">
          <div className="title-group">
            <Sparkles size={18} className="text-indigo" />
            <h3>Suggestion de Classement Intelligent</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          <div className="doc-name-banner">
            <FileText size={18} className="text-indigo" />
            <span className="file-name">{document.originalName}</span>
          </div>

          {errorMsg && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {suggestion && !isEditing ? (
            <div className="suggestion-box glass-card">
              <div className="box-header">
                <span className="box-title">Emplacement Proposé</span>
                <span className={`confidence-pill ${confidenceClass}`}>
                  {suggestion.confidenceScore}% confiance
                </span>
              </div>

              <div className="location-preview">
                <Layers size={16} className="text-indigo" />
                <span className="location-path">
                  {suggestion.proposedSubjectName || 'Matière non attribuée'} ➔{' '}
                  <strong className="uppercase">{suggestion.proposedDocType}</strong>
                </span>
              </div>

              <p className="explanation-text">{suggestion.explanation}</p>
            </div>
          ) : (
            <div className="edit-location-form">
              <div className="form-group">
                <label>Sélectionner la matière d'accueil *</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  <option value="">Sélectionnez une matière...</option>
                  {allSubjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Type de document *</label>
                <select
                  value={selectedDocType}
                  onChange={(e) => setSelectedDocType(e.target.value)}
                >
                  <option value="cours">Cours</option>
                  <option value="TD">Travaux Dirigés (TD)</option>
                  <option value="TP">Travaux Pratiques (TP)</option>
                  <option value="examen">Examen / Annales</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn-reject" onClick={handleReject} title="Laisser dans non classés">
            <XCircle size={15} />
            <span>Rejeter</span>
          </button>

          {!isEditing ? (
            <>
              <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <Edit3 size={15} />
                <span>Modifier</span>
              </button>

              <button className="btn-accept" onClick={handleAccept} disabled={submitting}>
                <Check size={16} />
                <span>{submitting ? 'Classement...' : 'Valider le classement'}</span>
              </button>
            </>
          ) : (
            <button className="btn-accept" onClick={handleModify} disabled={submitting}>
              <Check size={16} />
              <span>Confirmer l'emplacement</span>
            </button>
          )}
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
          display: flex; align-items: center; justify-content: center; z-index: 115; padding: 1rem;
        }

        .classification-modal-card {
          width: 100%; max-width: 500px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.15rem;
        }

        .modal-header { display: flex; align-items: center; justify-content: space-between; }
        .title-group { display: flex; align-items: center; gap: 0.5rem; }
        .title-group h3 { font-size: 1.05rem; font-weight: 700; }

        .modal-body { display: flex; flex-direction: column; gap: 0.85rem; }

        .doc-name-banner {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.85rem;
          border-radius: var(--radius-md); background: rgba(0, 0, 0, 0.25); border: 1px solid var(--border-color);
        }

        .file-name { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); word-break: break-all; }

        .suggestion-box {
          padding: 1rem; display: flex; flex-direction: column; gap: 0.65rem; background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.25);
        }

        .box-header { display: flex; align-items: center; justify-content: space-between; }
        .box-title { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); uppercase; }

        .confidence-pill { font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: var(--radius-full); }
        .confidence-pill.high { background: var(--status-success-bg); color: var(--status-success); }
        .confidence-pill.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .confidence-pill.low { background: var(--status-error-bg); color: var(--status-error); }

        .location-preview { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-primary); }
        .location-path { font-weight: 600; }

        .explanation-text { font-size: 0.775rem; color: var(--text-muted); font-style: italic; }

        .edit-location-form { display: flex; flex-direction: column; gap: 0.75rem; }
        .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
        .form-group select {
          padding: 0.55rem; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.85rem;
        }

        .modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.65rem; pt: 0.5rem; border-top: 1px solid var(--border-color); }

        .btn-reject { display: flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.1); color: var(--status-error); font-size: 0.8rem; font-weight: 600; }
        .btn-edit { display: flex; align-items: center; gap: 0.25rem; padding: 0.5rem 0.75rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.8rem; font-weight: 600; }
        .btn-accept { display: flex; align-items: center; gap: 0.35rem; padding: 0.5rem 1.15rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-weight: 700; font-size: 0.825rem; box-shadow: var(--shadow-glow); }

        .alert-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem; border-radius: var(--radius-md); background: var(--status-error-bg); color: var(--status-error); font-size: 0.8rem; }
        .text-indigo { color: var(--primary); }
        .uppercase { text-transform: uppercase; }
      `}</style>
    </div>
  );
};
