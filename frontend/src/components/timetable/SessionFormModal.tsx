import React, { useState, useEffect, useMemo } from 'react';
import { AcademicStructureTree } from '../../types/structure';
import * as structureService from '../../services/academicStructureService';
import * as timetableService from '../../services/timetableService';
import { TimetableSessionInput } from '../../types/validators';
import { X, Plus, AlertCircle, Calendar, BookOpen, Check } from 'lucide-react';
import { getSessionTypes, SessionTypeConfig } from '../../utils/sessionTypesConfig';

interface SessionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDayOfWeek?: number;
  initialStartTime?: string;
  initialEcueId?: string;
  initialSubjectId?: string;
  initialDurationMinutes?: number;
  tree: AcademicStructureTree | null;
}

const DAYS_OF_WEEK = [
  'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'
];

const DURATION_OPTIONS = [
  { value: 30, label: '30 min' },
  { value: 60, label: '1 h' },
  { value: 90, label: '1 h 30 (défaut)' },
  { value: 120, label: '2 h' },
  { value: 150, label: '2 h 30' },
  { value: 180, label: '3 h' },
  { value: 240, label: '4 h' },
];

export const SessionFormModal: React.FC<SessionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialDayOfWeek = 0,
  initialStartTime = '08:00',
  initialEcueId = '',
  initialSubjectId = '',
  initialDurationMinutes = 90,
  tree,
}) => {
  const [subjectId, setSubjectId] = useState<string>(initialSubjectId);
  const [selectedEcueId, setSelectedEcueId] = useState<string>(initialEcueId);
  const [dayOfWeek, setDayOfWeek] = useState<number>(initialDayOfWeek);
  const [startTime, setStartTime] = useState<string>(initialStartTime);
  const [durationMinutes, setDurationMinutes] = useState<number>(initialDurationMinutes);
  const [endTime, setEndTime] = useState<string>('09:30');
  const [room, setRoom] = useState<string>('');
  const [instructor, setInstructor] = useState<string>('');
  const [sessionType, setSessionType] = useState<string>('CM');
  const [recurrence, setRecurrence] = useState<'weekly' | 'biweekly' | 'none'>('weekly');
  const [notes, setNotes] = useState<string>('');
  const [availableTypes, setAvailableTypes] = useState<SessionTypeConfig[]>([]);

  // Manual course picker toggle
  const [showManualCoursePicker, setShowManualCoursePicker] = useState<boolean>(false);

  // Inline Quick Subject Creation Subform
  const [showQuickSubject, setShowQuickSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [selectedUeId, setSelectedUeId] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setAvailableTypes(getSessionTypes());
  }, [isOpen]);

  // Recalculate end time whenever startTime or durationMinutes changes
  const updateEndTime = (startStr: string, durationMins: number) => {
    const [h, m] = startStr.split(':').map(Number);
    const totalStartMins = h * 60 + m;
    const totalEndMins = Math.min(24 * 60, totalStartMins + durationMins);
    const endH = String(Math.floor(totalEndMins / 60)).padStart(2, '0');
    const endM = String(totalEndMins % 60).padStart(2, '0');
    setEndTime(`${endH}:${endM}`);
  };

  useEffect(() => {
    setDayOfWeek(initialDayOfWeek);
    setStartTime(initialStartTime);
    setDurationMinutes(initialDurationMinutes);

    const effectiveEcue = initialEcueId || initialSubjectId || '';
    const effectiveSub = initialSubjectId || initialEcueId || '';

    setSelectedEcueId(effectiveEcue);
    setSubjectId(effectiveSub);
    setShowManualCoursePicker(!effectiveEcue && !effectiveSub);

    updateEndTime(initialStartTime, initialDurationMinutes);
  }, [initialDayOfWeek, initialStartTime, initialEcueId, initialSubjectId, initialDurationMinutes, isOpen]);

  // Build full course options list (all ECUEs and Subjects)
  const allCourseOptions = useMemo(() => {
    const options: { id: string; name: string; ecueId?: string; instructor?: string | null }[] = [];
    if (!tree) return options;

    tree.semesters.forEach((sem) => {
      sem.ues.forEach((ue) => {
        ue.ecues.forEach((ecue) => {
          options.push({
            id: ecue.id,
            name: `S${sem.number} — ${ecue.code ? '[' + ecue.code + '] ' : ''}${ecue.title}`,
            ecueId: ecue.id,
            instructor: ecue.instructor,
          });

          ecue.subjects?.forEach((sub) => {
            if (sub.id !== ecue.id) {
              options.push({
                id: sub.id,
                name: `S${sem.number} — ${ecue.code ? '[' + ecue.code + '] ' : ''}${sub.name}`,
                ecueId: ecue.id,
                instructor: sub.instructor || ecue.instructor,
              });
            }
          });
        });

        ue.directSubjects?.forEach((sub) => {
          options.push({
            id: sub.id,
            name: `S${sem.number} — ${ue.code ? '[' + ue.code + '] ' : ''}${sub.name}`,
            instructor: sub.instructor,
          });
        });
      });
    });

    return options;
  }, [tree]);

  // Find title of pre-selected course
  const selectedCourseLabel = useMemo(() => {
    const activeId = subjectId || selectedEcueId;
    if (!activeId) return null;
    const match = allCourseOptions.find((o) => o.id === activeId || o.ecueId === activeId);
    return match ? match.name : 'Cours sélectionné';
  }, [allCourseOptions, subjectId, selectedEcueId]);

  // Pre-fill instructor when course changes
  useEffect(() => {
    const activeId = subjectId || selectedEcueId;
    if (activeId && allCourseOptions.length > 0) {
      const match = allCourseOptions.find((o) => o.id === activeId || o.ecueId === activeId);
      if (match && match.instructor) {
        setInstructor(match.instructor);
      }
    }
  }, [subjectId, selectedEcueId, allCourseOptions]);

  if (!isOpen) return null;

  const handleSelectCourse = (chosenId: string) => {
    const match = allCourseOptions.find((o) => o.id === chosenId);
    if (match) {
      setSubjectId(match.id);
      if (match.ecueId) setSelectedEcueId(match.ecueId);
      else setSelectedEcueId(match.id);
      if (match.instructor) setInstructor(match.instructor);
    } else {
      setSubjectId(chosenId);
      setSelectedEcueId(chosenId);
    }
    setShowManualCoursePicker(false);
  };

  const handleCreateQuickSubject = async () => {
    if (!newSubjectName.trim() || !selectedUeId) return;
    try {
      const res = await structureService.createECUE({
        title: newSubjectName.trim(),
        ueId: selectedUeId,
      });
      if (res.success && res.data) {
        setShowQuickSubject(false);
        setNewSubjectName('');
        setSelectedEcueId(res.data.id);
        setSubjectId(res.data.id);
        setShowManualCoursePicker(false);
        onSuccess();
      }
    } catch (_e) {
      /* ignore */
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const finalSubId = subjectId || selectedEcueId;

    if (!finalSubId) {
      setErrorMsg('Veuillez sélectionner un cours ou une ECUE dans la liste.');
      return;
    }

    if (startTime >= endTime) {
      setErrorMsg('L\'heure de début doit être antérieure à l\'heure de fin.');
      return;
    }

    setSubmitting(true);
    try {
      const combinedNotes = [
        instructor.trim() ? `Enseignant: ${instructor.trim()}` : '',
        notes.trim(),
      ].filter(Boolean).join('\n');

      const payload: TimetableSessionInput = {
        subjectId: finalSubId,
        ecueId: selectedEcueId || finalSubId,
        dayOfWeek: Number(dayOfWeek),
        startTime,
        endTime,
        room: room.trim() || null,
        sessionType: sessionType as any,
        recurrence,
        notes: combinedNotes || null,
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

  const activeCourseId = subjectId || selectedEcueId;

  return (
    <div className="modal-backdrop">
      <div className="glass-card session-modal-card">
        {/* Header */}
        <div className="modal-header">
          <div className="title-group">
            <Calendar size={20} className="text-indigo" />
            <h3>Ajouter une Séance de Cours</h3>
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

          {/* Locked Selected Course Banner OR Dropdown Switcher */}
          {!showManualCoursePicker && activeCourseId ? (
            <div className="selected-course-banner glass-card">
              <div className="banner-left">
                <BookOpen size={18} className="text-indigo" />
                <div className="banner-text">
                  <span className="banner-sub">Cours sélectionné :</span>
                  <span className="banner-main-title">{selectedCourseLabel}</span>
                </div>
              </div>
              <button
                type="button"
                className="btn-switch-course"
                onClick={() => setShowManualCoursePicker(true)}
              >
                Changer de cours
              </button>
            </div>
          ) : (
            <div className="form-group">
              <div className="label-row">
                <label>Cours / ECUE d'enseignement *</label>
                <button
                  type="button"
                  className="btn-quick-create"
                  onClick={() => setShowQuickSubject(!showQuickSubject)}
                >
                  <Plus size={12} />
                  <span>Nouveau cours</span>
                </button>
              </div>

              {showQuickSubject ? (
                <div className="quick-subject-subform glass-card">
                  <input
                    type="text"
                    placeholder="Intitulé du cours (ex: Microéconomie II)"
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
                    Créer et sélectionner
                  </button>
                </div>
              ) : (
                <select
                  value={activeCourseId}
                  onChange={(e) => handleSelectCourse(e.target.value)}
                >
                  <option value="">-- Sélectionnez une ECUE / matière --</option>
                  {activeCourseId && !allCourseOptions.some((o) => o.id === activeCourseId) && (
                    <option value={activeCourseId}>
                      {selectedCourseLabel || '[Cours sélectionné]'}
                    </option>
                  )}
                  {allCourseOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Prominent Session Type Chips Selector (CM, TD, TP, Compo, Révision...) */}
          <div className="form-group margin-top-sm">
            <label className="section-label">Type de séance (CM, TD, Compo, Révision...) *</label>
            <div className="type-chips-container">
              {availableTypes.map((type) => {
                const isActive = sessionType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    className={`type-chip-btn ${isActive ? 'active' : ''}`}
                    style={{
                      borderColor: isActive ? type.color : 'rgba(255,255,255,0.15)',
                      backgroundColor: isActive ? `${type.color}30` : 'rgba(15, 23, 42, 0.5)',
                      color: isActive ? '#ffffff' : 'var(--text-primary)',
                      boxShadow: isActive ? `0 0 12px ${type.color}40` : 'none',
                    }}
                    onClick={() => setSessionType(type.id)}
                  >
                    <span className="chip-color-dot" style={{ backgroundColor: type.color }} />
                    <span className="chip-label">{type.id}</span>
                    {isActive && <Check size={12} className="check-icon" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 1: Day & Duration */}
          <div className="form-grid-2">
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

            <div className="form-group">
              <label>Durée estimée *</label>
              <select
                value={durationMinutes}
                onChange={(e) => {
                  const mins = Number(e.target.value);
                  setDurationMinutes(mins);
                  updateEndTime(startTime, mins);
                }}
              >
                {DURATION_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Start Time & End Time */}
          <div className="form-grid-2">
            <div className="form-group">
              <label>Heure de début *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  updateEndTime(e.target.value, durationMinutes);
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>Heure de fin *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Row 3: Room, Instructor, Recurrence */}
          <div className="form-grid-3">
            <div className="form-group">
              <label>Salle (optionnel)</label>
              <input
                type="text"
                placeholder="ex: Amphi A, Salle 102"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Enseignant (optionnel)</label>
              <input
                type="text"
                placeholder="ex: Dr. Dupont"
                value={instructor}
                onChange={(e) => setInstructor(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Récurrence</label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as 'weekly' | 'biweekly' | 'none')}
              >
                <option value="weekly">Hebdomadaire</option>
                <option value="biweekly">1 sem. sur 2</option>
                <option value="none">Une seule fois</option>
              </select>
            </div>
          </div>

          {/* Row 4: Notes */}
          <div className="form-group">
            <label>Notes & remarques (optionnel)</label>
            <input
              type="text"
              placeholder="ex: Chapitres 1 à 3, Apporter calculatrice..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Form Actions */}
          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={submitting}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="btn-primary btn-submit-large"
              disabled={submitting}
            >
              {submitting ? (
                <span>Enregistrement...</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Enregistrer la séance ({sessionType})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .session-modal-card {
          width: 580px;
          max-width: 95vw;
          padding: 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          background: rgba(15, 23, 42, 0.96);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 16px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          color: #f8fafc;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .title-group h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .btn-close {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 6px;
        }
        .btn-close:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.1);
        }

        .session-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .session-form input[type="text"],
        .session-form input[type="time"],
        .session-form select {
          width: 100%;
          padding: 0.55rem 0.85rem;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(30, 41, 59, 0.7);
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .session-form input[type="text"]:focus,
        .session-form input[type="time"]:focus,
        .session-form select:focus {
          border-color: #6366f1;
          background: rgba(30, 41, 59, 0.95);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.3);
        }

        .session-form select option {
          background: #0f172a;
          color: #ffffff;
        }

        .form-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.85rem;
        }

        .form-grid-3 {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 0.85rem;
        }

        .selected-course-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem 1.1rem;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.18);
          border: 1px solid rgba(99, 102, 241, 0.45);
        }

        .banner-left {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .banner-text {
          display: flex;
          flex-direction: column;
        }

        .banner-sub {
          font-size: 0.7rem;
          color: #818cf8;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .banner-main-title {
          font-size: 0.925rem;
          font-weight: 700;
          color: #ffffff;
        }

        .btn-switch-course {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #e2e8f0;
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-switch-course:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.18);
          border-color: rgba(255, 255, 255, 0.4);
        }

        .section-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: #94a3b8;
          margin-bottom: 0.4rem;
          display: block;
        }

        .type-chips-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .type-chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 0.85rem;
          border-radius: 20px;
          border: 1px solid;
          font-size: 0.825rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .type-chip-btn:hover {
          transform: translateY(-1px);
        }

        .chip-color-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .btn-quick-create {
          background: none;
          border: none;
          color: #818cf8;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
        }
        .btn-quick-create:hover {
          color: #a5b4fc;
        }

        .btn-submit-large {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.35rem;
          font-weight: 700;
          border-radius: 8px;
          background: var(--gradient-primary);
          color: #ffffff;
          border: none;
          cursor: pointer;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 0.5rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }
      `}</style>
    </div>
  );
};
