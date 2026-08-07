import React, { useState, useEffect } from 'react';
import { TimetableSession } from '../../types/timetable';
import * as timetableService from '../../services/timetableService';
import { Calendar, Clock, MapPin, ChevronRight, AlertTriangle } from 'lucide-react';

interface TodaySessionsWidgetProps {
  onNavigateToTimetable: () => void;
  onNavigateToDocuments: (subjectId: string) => void;
}

export const TodaySessionsWidget: React.FC<TodaySessionsWidgetProps> = ({
  onNavigateToTimetable,
  onNavigateToDocuments,
}) => {
  const [sessions, setSessions] = useState<TimetableSession[]>([]);

  useEffect(() => {
    timetableService.getTodaySessions().then((res) => {
      if (res.success && res.data) setSessions(res.data);
    });
  }, []);

  return (
    <div className="glass-card widget-card full-width-widget">
      <div className="widget-header">
        <div className="header-left">
          <Calendar size={16} className="text-indigo" />
          <h3>Séances du jour (Aujourd'hui)</h3>
        </div>
        <button className="btn-view-all" onClick={onNavigateToTimetable}>
          <span>Emploi du temps complet</span>
          <ChevronRight size={14} />
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="empty-today-box">
          <p>Aucun cours programmé aujourd'hui. Bonnes révisions ! 📚</p>
        </div>
      ) : (
        <div className="today-sessions-grid">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="today-session-card"
              onClick={() => onNavigateToDocuments(session.subjectId)}
              title="Cliquer pour voir les cours & TD de cette matière"
            >
              <div className="time-badge">
                <Clock size={12} />
                <span>{session.startTime} - {session.endTime}</span>
              </div>

              <div className="card-content">
                <span className="session-type">{session.sessionType}</span>
                <span className="subject-name">{session.subject?.name}</span>
                {session.room && (
                  <span className="room-info">
                    <MapPin size={11} /> {session.room}
                  </span>
                )}
              </div>

              {session.hasConflict && (
                <div className="conflict-tag" title="Conflit d'horaires détecté">
                  <AlertTriangle size={12} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <style>{`
        .widget-header {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem;
        }

        .header-left { display: flex; align-items: center; gap: 0.5rem; }

        .btn-view-all {
          display: flex; align-items: center; gap: 0.2rem; font-size: 0.775rem; color: var(--primary); font-weight: 600;
        }

        .empty-today-box {
          padding: 1.25rem; text-align: center; color: var(--text-muted); font-size: 0.85rem; background: rgba(0, 0, 0, 0.2); border-radius: var(--radius-md);
        }

        .today-sessions-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem;
        }

        .today-session-card {
          position: relative; padding: 0.85rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color); cursor: pointer; transition: transform var(--transition-fast), border-color var(--transition-fast);
          display: flex; flex-direction: column; gap: 0.4rem;
        }

        .today-session-card:hover {
          transform: translateY(-2px); border-color: var(--primary); background: rgba(255, 255, 255, 0.06);
        }

        .time-badge {
          display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.725rem; font-weight: 700; color: var(--accent-cyan);
        }

        .card-content { display: flex; flex-direction: column; gap: 0.15rem; }

        .session-type { font-size: 0.65rem; font-weight: 800; color: var(--primary); text-transform: uppercase; }

        .subject-name { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }

        .room-info { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; color: var(--text-muted); }

        .conflict-tag { position: absolute; top: 0.5rem; right: 0.5rem; color: var(--status-error); }

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
