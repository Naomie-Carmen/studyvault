import React, { useState, useEffect } from 'react';
import { AcademicStructureTree } from '../../types/structure';
import * as structureService from '../../services/academicStructureService';
import * as timetableService from '../../services/timetableService';
import { TimetableSessionInput } from '../../types/validators';
import { X, Plus, AlertCircle, Calendar } from 'lucide-react';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDayOfWeek?: number;
  initialStartTime?: string;
  tree: AcademicStructureTree | null;
}

const DAYS_OF_WEEK = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDayOfWeek = 0,
  initialStartTime = '08:00',
  tree,
}) => {
  const [subjectId, setSubjectId] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState(initialDayOfWeek);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('');
  const [sessionType, setSessionType] = useState<'CM' | 'TD' | 'TP' | 'EXAM' | 'OTHER'>('CM');
  const [recurrence, setRecurrence] = useState<'weekly' | 'biweekly' | 'none'>('weekly');
  const [notes, setNotes] = useState('');

  // Inline Quick Subject Creation Subform
  const [showQuickSubject, setShowQuickSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedUeId, setSelectedUeId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setDayOfWeek(initialDayOfWeek);
    setStartTime(initialStartTime);

    // Calculate default end time = startTime + 2 hours
    const [h, m] = initialStartTime.split(':').map(Number);
    const endH = String(Math.min(21, h + 2)).padStart(2, '0');
    setEndTime(`${endH}:${String(m).padStart(2, '0')}`);
  }, [initialDayOfWeek, initialStartTime]);

  if (!isOpen) return null;

  // Flatten all subjects from structure tree
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

  const handleCreateQuickSubject = async () => {
    if (!newSubjectName.trim() || !selectedUeId) return;
    try {
      const res = await structureService.createSubject({
        name: newSubjectName.trim(),
        ueId: selectedUeId,
      });
      if (res.success && res.data) {
        setSubjectId(res.data.id);
        setShowQuickSubject(false);
        setNewSubjectName('');
      }
    } catch (_e) {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!subjectId) {
      setErrorMsg('Veuillez sélectionner une matière d\'enseignement.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('L\'heure de début doit être antérieure à l\'heure de fin.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: TimetableSessionInput = {
        subjectId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        room: room.trim() || null,
        sessionType,
        recurrence,
        notes: notes.trim() || null,
      };

      const res = await timetableService.createSession(payload);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMsg(res.error?.message || 'Erreur lors de la création de la séance.');
      }
    } catch (_err) {
      setErrorMsg('Impossible d\'enregistrer la séance.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card session-modal-card">
        <div className="modal-header">
          <div className="title-group">
            <Calendar size={18} className="text-indigo" />
            <h3>Nouvelle Séance de Cours</h3>
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="session-form">
          {errorMsg && (
            <div className="alert alert-error">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Subject Picker with Quick Create Trigger */}
          <div className="form-group">
            <div className="label-row">
              <label>Matière d'enseignement *</label>
              <button
                type="button"
                className="btn-quick-create"
                onClick={() => setShowQuickSubject(!showQuickSubject)}
              >
                <Plus size={12} />
                <span>Créer une matière</span>
              </button>
            </div>

            {showQuickSubject ? (
              <div className="quick-subject-subform glass-card">
                <input
                  type="text"
                  placeholder="Nom de la matière (ex: Microéconomie II)"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                />
                <select
                  value={selectedUeId}
                  onChange={(e) => setSelectedUeId(e.target.value)}
                >
                  <option value="">Sélectionnez l'UE parente *</option>
                  {tree?.semesters.flatMap((sem) =>
                    sem.ues.map((ue) => (
                      <option key={ue.id} value={ue.id}>
                        S{sem.number} — {ue.title}
                      </option>
                    ))
                  )}
                </select>
                <button
                  type="button"
                  className="btn-save-sub"
                  onClick={handleCreateQuickSubject}
                >
                  Valider la création
                </button>
              </div>
            ) : (
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
              >
                <option value="">Sélectionnez une matière...</option>
                {allSubjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Day of Week */}
          <div className="form-group">
            <label>Jour de la semaine *</label>
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(Number(e.target.value))}
            >
              {DAYS_OF_WEEK.map((day, idx) => (
                <option key={idx} value={idx}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Times Row */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Heure de début *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group flex-1">
              <label>Heure de fin *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Session Type Radios */}
          <div className="form-group">
            <label>Type de séance *</label>
            <div className="session-type-radios">
              {(['CM', 'TD', 'TP', 'EXAM', 'OTHER'] as const).map((t) => (
                <label key={t} className={`type-radio-label ${sessionType === t ? 'active' : ''}`}>
                  <input
                    type="radio"
                    name="sessionType"
                    value={t}
                    checked={sessionType === t}
                    onChange={() => setSessionType(t)}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Room & Recurrence */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label>Salle (optionnel)</label>
              <input
                type="text"
                placeholder="ex: Amphi B / Salle 204"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="form-group flex-1">
              <label>Récurrence</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as 'weekly' | 'biweekly' | 'none')}
              >
                <option value="weekly">Chaque semaine</option>
                <option value="biweekly">Une semaine sur deux</option>
                <option value="none">Une seule fois</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label>Notes & consignes (optionnel)</label>
            <textarea
              placeholder="Consignes particulières, matériel à apporter..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Enregistrement...' : 'Enregistrer la séance'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
          display: flex; align-items: center; justify-content: center; z-index: 110; padding: 1rem;
        }

        .session-modal-card {
          width: 100%; max-width: 500px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
        }

        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
        }

        .title-group { display: flex; align-items: center; gap: 0.5rem; }
        .title-group h3 { font-size: 1.1rem; font-weight: 700; }

        .session-form { display: flex; flex-direction: column; gap: 0.85rem; }

        .label-row { display: flex; align-items: center; justify-content: space-between; }

        .btn-quick-create {
          display: flex; align-items: center; gap: 0.25rem; font-size: 0.725rem; color: var(--primary); font-weight: 600;
        }

        .quick-subject-subform {
          padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; background: rgba(99, 102, 241, 0.08); border-color: rgba(99, 102, 241, 0.25);
        }

        .btn-save-sub {
          padding: 0.4rem; border-radius: var(--radius-sm); background: var(--gradient-primary); color: #ffffff; font-size: 0.75rem; font-weight: 600;
        }

        .form-group { display: flex; flex-direction: column; gap: 0.35rem; }
        .form-group label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }

        .form-group input, .form-group select, .form-group textarea {
          width: 100%; padding: 0.55rem; background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color); border-radius: var(--radius-md);
          color: var(--text-primary); font-size: 0.85rem; outline: none;
        }

        .form-row { display: flex; gap: 0.75rem; }
        .flex-1 { flex: 1; }

        .session-type-radios { display: flex; gap: 0.4rem; }

        .type-radio-label {
          flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.25rem;
          padding: 0.4rem; border-radius: var(--radius-sm); background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color); font-size: 0.75rem; font-weight: 700; cursor: pointer;
        }

        .type-radio-label input { display: none; }
        .type-radio-label.active { background: var(--gradient-primary); color: #ffffff; border-color: transparent; }

        .modal-actions { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; margin-top: 0.5rem; }
        .btn-cancel { padding: 0.5rem 0.85rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.825rem; }
        .btn-submit { padding: 0.5rem 1.15rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-size: 0.825rem; font-weight: 600; }

        .alert-error {
          display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem; border-radius: var(--radius-md); background: var(--status-error-bg); color: var(--status-error); font-size: 0.8rem;
        }
        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
