import React, { useState } from 'react';
import { X, Repeat, Calendar, AlertCircle } from 'lucide-react';
import * as timetableService from '../../services/timetableService';

interface DuplicateWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentWeekMonday: Date;
}

const formatDateToYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const DuplicateWeekModal: React.FC<DuplicateWeekModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentWeekMonday,
}) => {
  const [weeksCount, setWeeksCount] = useState<number>(4);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Calculate target week Mondays
  const getTargetWeekMondays = (count: number): Date[] => {
    const list: Date[] = [];
    for (let i = 1; i <= count; i++) {
      const nextMon = new Date(currentWeekMonday);
      nextMon.setDate(currentWeekMonday.getDate() + i * 7);
      list.push(nextMon);
    }
    return list;
  };

  const targetMondays = getTargetWeekMondays(weeksCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const targetWeekStarts = targetMondays.map(formatDateToYYYYMMDD);

    try {
      const res = await timetableService.duplicateWeek(targetWeekStarts);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error?.message || 'Erreur lors de la duplication de la semaine.');
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
            <Repeat size={20} className="text-emerald" />
            <h3>Dupliquer la semaine d'emploi du temps</h3>
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

          <p className="description">
            Cette action copiera l'intégralité des séances de cette semaine sur les semaines futures sélectionnées.
          </p>

          <div className="form-group">
            <label>Nombre de semaines cibles à dupliquer :</label>
            <div className="preset-buttons">
              {[1, 2, 4, 8, 12, 16].map((num) => (
                <button
                  key={num}
                  type="button"
                  className={`preset-btn ${weeksCount === num ? 'active' : ''}`}
                  onClick={() => setWeeksCount(num)}
                >
                  {num} semaine{num > 1 ? 's' : ''}
                </button>
              ))}
            </div>
          </div>

          <div className="target-preview-box">
            <span className="preview-title">📅 Semaines impactées ({weeksCount}) :</span>
            <ul className="preview-list">
              {targetMondays.map((m, idx) => {
                const sunday = new Date(m);
                sunday.setDate(m.getDate() + 6);
                const start = m.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
                const end = sunday.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

                return (
                  <li key={idx}>
                    <Calendar size={13} className="text-muted" />
                    <span>Semaine {idx + 1} : du {start} au {end}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Duplication...' : `🔁 Appliquer sur les ${weeksCount} semaines`}
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
          width: 500px;
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
        }

        .modal-body {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .description {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.5;
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
          gap: 0.6rem;
        }

        .form-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .preset-buttons {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
        }

        .preset-btn {
          padding: 0.5rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.3);
          color: var(--text-secondary);
          font-size: 0.825rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .preset-btn.active {
          background: rgba(52, 211, 153, 0.15);
          border-color: #34d399;
          color: #ffffff;
          font-weight: 600;
        }

        .target-preview-box {
          padding: 0.85rem;
          border-radius: 8px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 160px;
          overflow-y: auto;
        }

        .preview-title {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .preview-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .preview-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.78rem;
          color: var(--text-secondary);
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
          background: #10b981;
          border: none;
          color: #ffffff;
          font-weight: 600;
          cursor: pointer;
        }

        .text-emerald { color: #34d399; }
      `}</style>
    </div>
  );
};
