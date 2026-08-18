import React, { useState } from 'react';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import { TimetableSession } from '../../types/timetable';
import * as timetableService from '../../services/timetableService';

interface DuplicateSessionModalProps {
  session: TimetableSession | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const DuplicateSessionModal: React.FC<DuplicateSessionModalProps> = ({
  session,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !session) return null;

  const toggleDay = (dayIndex: number) => {
    if (dayIndex === session.dayOfWeek) return;
    setSelectedTargetDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTargetDays.length === 0) {
      setError('Veuillez sélectionner au moins un jour de destination.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await timetableService.duplicateSession(session.id, selectedTargetDays);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'Erreur lors de la duplication.');
      }
    } catch (_e) {
      setError('Erreur réseau.');
    } finally {
      setLoading(false);
    }
  };

  const subjectName = session.subject?.name || session.ecue?.title || 'Cours';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-group">
            <Copy size={20} className="text-amber" />
            <h3>Dupliquer la séance</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div className="error-banner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="session-card-preview" style={{ borderLeftColor: session.color || '#6366f1' }}>
            <span className="session-title">{subjectName}</span>
            <span className="session-time">
              {DAY_NAMES[session.dayOfWeek]} · {session.startTime} - {session.endTime} ({session.sessionType})
            </span>
          </div>

          <div className="form-group">
            <label>Copier cette séance sur :</label>
            <div className="days-picker-grid">
              {DAY_NAMES.map((name, index) => {
                const isCurrent = index === session.dayOfWeek;
                const isChecked = selectedTargetDays.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    className={`day-chip ${isCurrent ? 'source-disabled' : ''} ${isChecked ? 'selected' : ''}`}
                    onClick={() => toggleDay(index)}
                    disabled={isCurrent}
                  >
                    <span>{name}</span>
                    {isCurrent && <span className="chip-badge">Actuel</span>}
                    {isChecked && <Check size={14} className="check-icon" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading || selectedTargetDays.length === 0}>
              {loading ? 'Duplication...' : `📋 Dupliquer sur ${selectedTargetDays.length} jour(s)`}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1300;
          padding: 1rem;
        }

        .modal-dialog {
          width: 440px;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          overflow: hidden;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .title-group h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
        }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .session-card-preview {
          padding: 0.85rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border-left: 4px solid #6366f1;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .session-title {
          font-size: 0.9rem;
          font-weight: 700;
          color: #ffffff;
        }

        .session-time {
          font-size: 0.78rem;
          color: var(--text-muted);
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          font-size: 0.825rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .days-picker-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .day-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.6rem 0.75rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.3);
          color: var(--text-secondary);
          font-size: 0.825rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .day-chip.selected {
          background: rgba(245, 158, 11, 0.2);
          border-color: #f59e0b;
          color: #ffffff;
          font-weight: 600;
        }

        .day-chip.source-disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .chip-badge {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.6rem;
          margin-top: 0.5rem;
        }

        .btn-secondary {
          padding: 0.55rem 1rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
        }

        .btn-primary {
          padding: 0.55rem 1.25rem;
          border-radius: 8px;
          background: #f59e0b;
          border: none;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
        }

        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
};
