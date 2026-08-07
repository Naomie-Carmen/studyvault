import React, { useState, useEffect } from 'react';
import { TimetableSuggestionItem, SuggestionStats } from '../../types/ocr';
import { AcademicStructureTree } from '../../types/structure';
import * as ocrService from '../../services/ocrService';
import * as structureService from '../../services/academicStructureService';
import { X, Check, ShieldCheck, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface TimetableValidationModalProps {
  importId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccessValidate: () => void;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const TimetableValidationModal: React.FC<TimetableValidationModalProps> = ({
  importId,
  isOpen,
  onClose,
  onSuccessValidate,
}) => {
  const [suggestions, setSuggestions] = useState<TimetableSuggestionItem[]>([]);
  const [stats, setStats] = useState<SuggestionStats | null>(null);
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [subjectAssignments, setSubjectAssignments] = useState<Record<string, string>>({});
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && importId) {
      Promise.all([
        ocrService.getSuggestions(importId),
        structureService.getStructureTree(),
      ]).then(([sugRes, treeRes]) => {
        if (sugRes.success && sugRes.data) {
          setSuggestions(sugRes.data.suggestions);
          setStats(sugRes.data.stats);

          // Pre-select high & medium confidence suggestions
          const initialSelected = new Set<string>();
          const initialAssignments: Record<string, string> = {};

          sugRes.data.suggestions.forEach((s) => {
            if (s.confidenceScore >= 50) initialSelected.add(s.id);
            if (s.matchedSubjectId) initialAssignments[s.id] = s.matchedSubjectId;
          });

          setSelectedIds(initialSelected);
          setSubjectAssignments(initialAssignments);
        }
        if (treeRes.success && treeRes.data) setTree(treeRes.data);
      });
    }
  }, [isOpen, importId]);

  if (!isOpen) return null;

  // Flatten user subjects
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

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllReliable = () => {
    const next = new Set<string>();
    suggestions.forEach((s) => {
      if (s.confidenceScore >= 80) next.add(s.id);
    });
    setSelectedIds(next);
  };

  const handleValidate = async () => {
    setErrorMsg(null);
    if (selectedIds.size === 0) {
      setErrorMsg('Veuillez sélectionner au moins une suggestion à valider.');
      return;
    }

    setValidating(true);
    try {
      const corrections = Array.from(selectedIds).map((id) => ({
        suggestionId: id,
        subjectId: subjectAssignments[id],
      }));

      const res = await ocrService.validateSuggestions(importId, Array.from(selectedIds), corrections);
      if (res.success) {
        onSuccessValidate();
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Erreur lors de la validation.');
      }
    } catch (_e) {
      setErrorMsg('Échec de la validation des suggestions.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card validation-modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="title-group">
            <ShieldCheck size={20} className="text-indigo" />
            <div>
              <h3>Validation Humaine des Séances Extraites (OCR)</h3>
              <p className="sub-text">
                Vérifiez et validez les séances détectées avant de les ajouter à votre emploi du temps.
              </p>
            </div>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Stats Summary Bar */}
        {stats && (
          <div className="stats-bar">
            <span className="stat-badge high">
              <CheckCircle2 size={13} /> {stats.highConfidence} Fiables (&gt;80%)
            </span>
            <span className="stat-badge medium">
              <AlertCircle size={13} /> {stats.mediumConfidence} À vérifier (50-80%)
            </span>
            <span className="stat-badge low">
              <XCircle size={13} /> {stats.lowConfidence} Incertains (&lt;50%)
            </span>

            <div className="actions-right">
              <button className="btn-quick-sel" onClick={selectAllReliable}>
                Sélectionner Fiables (&gt;80%)
              </button>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="alert alert-error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body: Split View / List */}
        <div className="validation-body">
          <div className="suggestions-list">
            {suggestions.map((s) => {
              const isSelected = selectedIds.has(s.id);
              const confidenceClass = s.confidenceScore >= 80 ? 'high' : s.confidenceScore >= 50 ? 'medium' : 'low';

              return (
                <div key={s.id} className={`suggestion-card ${isSelected ? 'selected' : ''}`}>
                  <div className="card-left">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(s.id)}
                    />
                  </div>

                  <div className="card-main">
                    <div className="card-top-row">
                      <span className="detected-raw">{s.detectedSubjectName}</span>
                      <span className={`confidence-pill ${confidenceClass}`}>
                        {s.confidenceScore}% confiance
                      </span>
                    </div>

                    <div className="card-detail-row">
                      <span className="detail-tag">{DAYS[s.dayOfWeek ?? 0]}</span>
                      <span className="detail-tag">{s.startTime} - {s.endTime}</span>
                      <span className="detail-tag type">{s.sessionType}</span>
                      {s.room && <span className="detail-tag">{s.room}</span>}
                    </div>

                    <div className="subject-matcher-box">
                      <label>Associer à la matière :</label>
                      <select
                        value={subjectAssignments[s.id] || ''}
                        onChange={(e) =>
                          setSubjectAssignments({ ...subjectAssignments, [s.id]: e.target.value })
                        }
                      >
                        <option value="">Sélectionnez une matière...</option>
                        {allSubjects.map((sub) => (
                          <option key={sub.id} value={sub.id}>
                            {sub.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>
            Rejeter Tout
          </button>
          <button
            className="btn-submit"
            onClick={handleValidate}
            disabled={validating || selectedIds.size === 0}
          >
            <Check size={16} />
            <span>
              {validating ? 'Création en cours...' : `Valider les ${selectedIds.size} séance(s) sélectionnée(s)`}
            </span>
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8);
          display: flex; align-items: center; justify-content: center; z-index: 120; padding: 1rem;
        }

        .validation-modal-card {
          width: 100%; max-width: 850px; height: 85vh; padding: 1.5rem;
          display: flex; flex-direction: column; gap: 1rem; overflow: hidden;
        }

        .modal-header { display: flex; align-items: center; justify-content: space-between; }
        .title-group { display: flex; align-items: center; gap: 0.75rem; }
        .title-group h3 { font-size: 1.15rem; font-weight: 800; }
        .sub-text { font-size: 0.8rem; color: var(--text-muted); }

        .stats-bar {
          display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 0.85rem;
          background: rgba(0, 0, 0, 0.3); border-radius: var(--radius-md); font-size: 0.775rem;
        }

        .stat-badge { display: flex; align-items: center; gap: 0.25rem; font-weight: 700; }
        .stat-badge.high { color: var(--status-success); }
        .stat-badge.medium { color: #f59e0b; }
        .stat-badge.low { color: var(--status-error); }

        .actions-right { margin-left: auto; }
        .btn-quick-sel { font-size: 0.75rem; color: var(--primary); font-weight: 600; text-decoration: underline; }

        .validation-body { flex: 1; overflow-y: auto; padding-right: 0.25rem; }
        .suggestions-list { display: flex; flex-direction: column; gap: 0.75rem; }

        .suggestion-card {
          display: flex; gap: 0.85rem; padding: 0.85rem; border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color);
        }

        .suggestion-card.selected { border-color: var(--primary); background: rgba(99, 102, 241, 0.06); }

        .card-left { display: flex; align-items: flex-start; pt: 0.2rem; }

        .card-main { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }

        .card-top-row { display: flex; align-items: center; justify-content: space-between; }
        .detected-raw { font-size: 0.95rem; font-weight: 700; color: var(--text-primary); }

        .confidence-pill {
          font-size: 0.65rem; font-weight: 800; padding: 0.15rem 0.45rem; border-radius: var(--radius-full);
        }
        .confidence-pill.high { background: var(--status-success-bg); color: var(--status-success); }
        .confidence-pill.medium { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
        .confidence-pill.low { background: var(--status-error-bg); color: var(--status-error); }

        .card-detail-row { display: flex; align-items: center; gap: 0.35rem; flex-wrap: wrap; }
        .detail-tag { font-size: 0.725rem; font-weight: 600; padding: 0.15rem 0.4rem; border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.06); color: var(--text-secondary); }
        .detail-tag.type { background: rgba(99, 102, 241, 0.2); color: var(--primary); font-weight: 800; }

        .subject-matcher-box { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.25rem; }
        .subject-matcher-box label { font-size: 0.75rem; color: var(--text-muted); }
        .subject-matcher-box select {
          flex: 1; padding: 0.35rem 0.5rem; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--border-color);
          border-radius: var(--radius-sm); color: var(--text-primary); font-size: 0.8rem;
        }

        .modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; pt: 0.5rem; border-top: 1px solid var(--border-color); }
        .btn-cancel { padding: 0.55rem 1rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.85rem; }
        .btn-submit { display: flex; align-items: center; gap: 0.35rem; padding: 0.55rem 1.25rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-weight: 700; font-size: 0.85rem; box-shadow: var(--shadow-glow); }

        .alert-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem; border-radius: var(--radius-md); background: var(--status-error-bg); color: var(--status-error); font-size: 0.8rem; }
        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
