import React, { useState } from 'react';
import { X, Copy, Check, AlertCircle } from 'lucide-react';
import * as timetableService from '../../services/timetableService';

interface DuplicateDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSourceDay?: number;
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const DuplicateDayModal: React.FC<DuplicateDayModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialSourceDay = 0,
}) => {
  const [sourceDay, setSourceDay] = useState<number>(initialSourceDay);
  const [selectedTargetDays, setSelectedTargetDays] = useState<number[]>([]);
  const [overwrite, setOverwrite] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleDay = (dayIndex: number) => {
    if (dayIndex === sourceDay) return;
    setSelectedTargetDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSelectAllWorkdays = () => {
    // Select Monday to Friday except source day
    const workdays = [0, 1, 2, 3, 4].filter((d) => d !== sourceDay);
    setSelectedTargetDays(workdays);
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
      const res = await timetableService.duplicateDay(sourceDay, selectedTargetDays, overwrite);
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

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="title-group">
            <Copy size={20} className="text-indigo" />
            <h3>Dupliquer une journée de cours</h3>
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

          <div className="form-group">
            <label>Jour source à copier :</label>
            <select
              value={sourceDay}
              onChange={(e) => {
                const newSource = Number(e.target.value);
                setSourceDay(newSource);
                setSelectedTargetDays((prev) => prev.filter((d) => d !== newSource));
              }}
            >
              {DAY_NAMES.map((name, index) => (
                <option key={index} value={index}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label>Jours de destination :</label>
              <button type="button" className="btn-link" onClick={handleSelectAllWorkdays}>
                Tous les jours ouvrés (Lun - Ven)
              </button>
            </div>

            <div className="days-picker-grid">
              {DAY_NAMES.map((name, index) => {
                const isSource = index === sourceDay;
                const isChecked = selectedTargetDays.includes(index);

                return (
                  <button
                    key={index}
                    type="button"
                    className={`day-chip ${isSource ? 'source-disabled' : ''} ${isChecked ? 'selected' : ''}`}
                    onClick={() => toggleDay(index)}
                    disabled={isSource}
                  >
                    <span>{name}</span>
                    {isSource && <span className="chip-badge">Source</span>}
                    {isChecked && <Check size={14} className="check-icon" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="form-checkbox-group">
            <input
              type="checkbox"
              id="overwriteDays"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            <label htmlFor="overwriteDays">
              Remplacer les séances existantes sur les jours sélectionnés (sinon ajouter les séances)
            </label>
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
          z-index: 1200;
          padding: 1rem;
        }

        .modal-dialog {
          width: 480px;
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
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0;
        }

        .close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.25rem;
        }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .error-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.15);
          border: 1px solid rgba(239, 68, 68, 0.3);
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

        .label-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-link {
          background: none;
          border: none;
          color: #818cf8;
          font-size: 0.78rem;
          cursor: pointer;
          text-decoration: underline;
        }

        .form-group select {
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: #ffffff;
          font-size: 0.9rem;
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

        .day-chip:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.05);
        }

        .day-chip.selected {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
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

        .form-checkbox-group {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .form-checkbox-group input {
          margin-top: 0.2rem;
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
          background: #6366f1;
          border: none;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
        }

        .text-indigo { color: #818cf8; }
      `}</style>
    </div>
  );
};
