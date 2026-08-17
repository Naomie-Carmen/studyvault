import { TimetableSession } from '../../types/timetable';
import * as timetableService from '../../services/timetableService';
import { X, Clock, MapPin, AlertTriangle, FileText, Trash2 } from 'lucide-react';

interface SessionDetailsModalProps {
  session: TimetableSession | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onDeleteSuccess?: () => void;
  onNavigateToDocuments?: (subjectId: string) => void;
}

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const SessionDetailsModal: React.FC<SessionDetailsModalProps> = ({
  session,
  isOpen,
  onClose,
  onDelete,
  onDeleteSuccess,
  onNavigateToDocuments,
}) => {
  if (!isOpen || !session) return null;

  return (
    <div className="modal-backdrop">
      <div className="glass-card session-details-card">
        <div className="details-header">
          <div className="header-badge-group">
            <span className="type-badge uppercase">{session.sessionType}</span>
            {session.hasConflict && (
              <span className="conflict-badge">
                <AlertTriangle size={12} /> Conflit d'horaire
              </span>
            )}
          </div>
          <button className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="details-body">
          <h2 className="subject-title">{session.subject?.name || 'Matière d\'enseignement'}</h2>

          <div className="meta-row">
            <Clock size={16} className="text-indigo" />
            <span>
              {DAYS[session.dayOfWeek] ?? 'Jour inconnu'} de {session.startTime} à {session.endTime}
            </span>
          </div>

          {session.room && (
            <div className="meta-row">
              <MapPin size={16} className="text-purple" />
              <span>Salle : {session.room}</span>
            </div>
          )}

          {session.notes && (
            <div className="notes-box">
              <p>{session.notes}</p>
            </div>
          )}

          {/* Quick Action: Access Documents for this Subject */}
          {onNavigateToDocuments && (
            <div className="quick-documents-cta" onClick={() => onNavigateToDocuments(session.subjectId)}>
              <FileText size={20} className="text-indigo" />
              <div className="cta-text">
                <h4>Consulter les cours & TD de la matière</h4>
                <p>Accédez directement aux documents académiques enregistrés sous cette matière.</p>
              </div>
            </div>
          )}
        </div>

        <div className="details-footer">
          <button
            className="btn-delete"
            onClick={async () => {
              if (onDelete) {
                onDelete(session.id);
              } else {
                await timetableService.deleteSession(session.id);
                if (onDeleteSuccess) onDeleteSuccess();
                onClose();
              }
            }}
          >
            <Trash2 size={16} />
            <span>Supprimer la séance</span>
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
          display: flex; align-items: center; justify-content: center; z-index: 110; padding: 1rem;
        }

        .session-details-card {
          width: 100%; max-width: 480px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
        }

        .details-header { display: flex; align-items: center; justify-content: space-between; }
        .header-badge-group { display: flex; align-items: center; gap: 0.5rem; }

        .type-badge {
          font-size: 0.7rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm);
          background: rgba(99, 102, 241, 0.2); color: var(--primary);
        }

        .conflict-badge {
          display: flex; align-items: center; gap: 0.25rem; font-size: 0.7rem; font-weight: 700;
          padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); background: var(--status-error-bg); color: var(--status-error);
        }

        .details-body { display: flex; flex-direction: column; gap: 0.85rem; }
        .subject-title { font-size: 1.35rem; font-weight: 700; color: var(--text-primary); }

        .meta-row { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; color: var(--text-secondary); }

        .notes-box {
          padding: 0.75rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color); font-size: 0.825rem; color: var(--text-muted);
        }

        .quick-documents-cta {
          display: flex; align-items: center; gap: 0.85rem; padding: 0.85rem 1rem; border-radius: var(--radius-md);
          background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); cursor: pointer;
          transition: background var(--transition-fast), transform var(--transition-fast);
        }

        .quick-documents-cta:hover { background: rgba(99, 102, 241, 0.2); transform: translateY(-1px); }

        .cta-text h4 { font-size: 0.85rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.1rem; }
        .cta-text p { font-size: 0.75rem; color: var(--text-muted); }

        .details-footer { display: flex; align-items: center; justify-content: flex-end; border-top: 1px solid var(--border-color); pt: 0.85rem; }

        .btn-delete {
          display: flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem; border-radius: var(--radius-md);
          background: rgba(239, 68, 68, 0.1); color: var(--status-error); font-size: 0.8rem; font-weight: 600;
        }

        .btn-delete:hover { background: rgba(239, 68, 68, 0.2); }
        .text-indigo { color: var(--primary); }
        .text-purple { color: var(--accent-purple); }
      `}</style>
    </div>
  );
};
