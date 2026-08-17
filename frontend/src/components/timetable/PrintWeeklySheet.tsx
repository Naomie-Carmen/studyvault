import React from 'react';
import { useTranslation } from 'react-i18next';
import { TimetableSession } from '../../types/timetable';
import { useAuth } from '../../context/useAuth';
import { useAcademic } from '../../context/useAcademic';

type TimetableWeekData = Record<number, TimetableSession[]>;

interface PrintWeeklySheetProps {
  weekData: TimetableWeekData | null;
  selectedWeekMonday?: Date;
}

function getWeekRange(refDate?: Date): { mondayStr: string; sundayStr: string } {
  const now = refDate ? new Date(refDate) : new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const monday = new Date(now);
  monday.setDate(now.getDate() + distanceToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatDate = (d: Date) => {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return {
    mondayStr: formatDate(monday),
    sundayStr: formatDate(sunday),
  };
}

export const PrintWeeklySheet: React.FC<PrintWeeklySheetProps> = ({ weekData, selectedWeekMonday }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useAcademic();

  const { mondayStr, sundayStr } = getWeekRange(selectedWeekMonday);
  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const firstName = user?.fullName ? user.fullName.split(' ')[0] : (user?.fullName || '');
  const university = profile?.university || '';
  const program = profile?.program || '';
  const level = profile?.level || '';

  const DAYS = [
    { key: 0, label: t('print.days.monday', 'Lundi') },
    { key: 1, label: t('print.days.tuesday', 'Mardi') },
    { key: 2, label: t('print.days.wednesday', 'Mercredi') },
    { key: 3, label: t('print.days.thursday', 'Jeudi') },
    { key: 4, label: t('print.days.friday', 'Vendredi') },
    { key: 5, label: t('print.days.saturday', 'Samedi') },
    { key: 6, label: t('print.days.sunday', 'Dimanche') },
  ];

  const getSortedDaySessions = (dayKey: number): TimetableSession[] => {
    if (!weekData || !Array.isArray(weekData[dayKey])) return [];
    return [...weekData[dayKey]].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });
  };

  return (
    <div className="print-sheet">
      <div className="sheet-inner">
        {/* Top Header Row */}
        <div className="sheet-header">
          {/* Top Left: Week Dates */}
          <div className="week-dates-box">
            <span className="date-line"><strong>{t('print.from', 'DU :')}</strong> {mondayStr}</span>
            <span className="date-line"><strong>{t('print.to', 'AU :')}</strong> {sundayStr}</span>
          </div>

          {/* Top Center: Calligraphic Title */}
          <div className="title-box">
            <h1 className="planner-title">{t('print.title', 'Ma Semaine')}</h1>
            <svg className="flourish-svg" width="120" height="12" viewBox="0 0 120 12" fill="none">
              <path d="M2 6 C30 1, 45 11, 60 6 C75 1, 90 11, 118 6" stroke="#d5afa6" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>

          {/* Top Right: Pink Ribbon Badge */}
          <div className="ribbon-badge">
            <span className="ribbon-text">PLANNER</span>
          </div>
        </div>

        {/* Personalized Student Subheader */}
        <div className="student-info-bar">
          <span>
            <strong>{firstName || 'Étudiant'}</strong>
            {(program || level) && ` — ${program} ${level}`}
            {university && ` · ${university}`}
          </span>
        </div>

        {/* 3-Column Grid Layout */}
        <div className="planner-grid">
          {/* Row 1: Lundi, Mardi, Mercredi */}
          {DAYS.slice(0, 3).map((day) => {
            const sessions = getSortedDaySessions(day.key);
            return (
              <div key={day.key} className="day-card">
                <h2 className="day-title">{day.label}</h2>
                <div className="sessions-container">
                  {sessions.length === 0 ? (
                    <div className="empty-day" />
                  ) : (
                    sessions.map((sess) => (
                      <div key={sess.id} className="session-item">
                        <div className="session-main">
                          <span className="session-time">{sess.startTime} – {sess.endTime}</span>
                          <span className="session-dot">·</span>
                          <span className="session-name">{sess.subject?.name || 'Cours'}</span>
                        </div>
                        {(sess.room || sess.sessionType) && (
                          <div className="session-sub">
                            {sess.room && <span>{t('print.room', 'Salle')} {sess.room}</span>}
                            {sess.sessionType && <span> ({sess.sessionType})</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Row 2: Jeudi, Vendredi, Samedi */}
          {DAYS.slice(3, 6).map((day) => {
            const sessions = getSortedDaySessions(day.key);
            return (
              <div key={day.key} className="day-card">
                <h2 className="day-title">{day.label}</h2>
                <div className="sessions-container">
                  {sessions.length === 0 ? (
                    <div className="empty-day" />
                  ) : (
                    sessions.map((sess) => (
                      <div key={sess.id} className="session-item">
                        <div className="session-main">
                          <span className="session-time">{sess.startTime} – {sess.endTime}</span>
                          <span className="session-dot">·</span>
                          <span className="session-name">{sess.subject?.name || 'Cours'}</span>
                        </div>
                        {(sess.room || sess.sessionType) && (
                          <div className="session-sub">
                            {sess.room && <span>{t('print.room', 'Salle')} {sess.room}</span>}
                            {sess.sessionType && <span> ({sess.sessionType})</span>}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* Row 3: Dimanche (1 col) + NE PAS OUBLIER (2 cols) */}
          {(() => {
            const sunday = DAYS[6];
            const sundaySessions = getSortedDaySessions(sunday.key);
            return (
              <>
                <div className="day-card">
                  <h2 className="day-title">{sunday.label}</h2>
                  <div className="sessions-container">
                    {sundaySessions.length === 0 ? (
                      <div className="empty-day" />
                    ) : (
                      sundaySessions.map((sess) => (
                        <div key={sess.id} className="session-item">
                          <div className="session-main">
                            <span className="session-time">{sess.startTime} – {sess.endTime}</span>
                            <span className="session-dot">·</span>
                            <span className="session-name">{sess.subject?.name || 'Cours'}</span>
                          </div>
                          {(sess.room || sess.sessionType) && (
                            <div className="session-sub">
                              {sess.room && <span>{t('print.room', 'Salle')} {sess.room}</span>}
                              {sess.sessionType && <span> ({sess.sessionType})</span>}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="day-card not-forget-card">
                  <h2 className="day-title not-forget-title">{t('print.doNotForget', 'NE PAS OUBLIER')}</h2>
                  <div className="ruled-lines">
                    <div className="ruled-line" />
                    <div className="ruled-line" />
                    <div className="ruled-line" />
                    <div className="ruled-line" />
                  </div>
                </div>
              </>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="sheet-footer">
          <span>{t('print.printedOn', 'StudyVault — imprimé le')} {todayFormatted}</span>
        </div>
      </div>

      <style>{`
        .sheet-inner {
          box-sizing: border-box;
          width: 100%;
          min-height: 100%;
          padding: 1.5rem;
          background-color: #f2efeb;
          color: #1a1a1a;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #dcd6ce;
        }

        .week-dates-box {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.8rem;
          color: #4a4a4a;
        }

        .title-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .planner-title {
          font-family: 'Parisienne', 'Great Vibes', cursive;
          font-size: 2.8rem;
          margin: 0;
          color: #2b2b2b;
          font-weight: 400;
          line-height: 1;
        }

        .flourish-svg {
          margin-top: 0.1rem;
        }

        .ribbon-badge {
          background-color: #e8c9c0;
          color: #5c3a32;
          padding: 0.35rem 1rem;
          border-radius: 20px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
        }

        .student-info-bar {
          text-align: center;
          font-size: 0.85rem;
          color: #555555;
          margin-top: -0.25rem;
          padding-bottom: 0.5rem;
        }

        .planner-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.9rem;
          flex: 1;
        }

        .day-card {
          background-color: #fbf9f7;
          border: 1px solid #e2ddd7;
          border-radius: 10px;
          padding: 0.8rem;
          display: flex;
          flex-direction: column;
          box-shadow: 0 1px 3px rgba(0,0,0,0.03);
          min-height: 170px;
        }

        .not-forget-card {
          grid-column: span 2;
        }

        .day-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.05rem;
          font-weight: 700;
          text-align: center;
          margin: 0 0 0.6rem 0;
          color: #2c2c2c;
          border-bottom: 1px solid #efeae4;
          padding-bottom: 0.4rem;
        }

        .not-forget-title {
          letter-spacing: 0.05em;
          color: #7a5c53;
        }

        .sessions-container {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          flex: 1;
        }

        .session-item {
          background-color: #ffffff;
          border-left: 3px solid #d5afa6;
          border-radius: 4px;
          padding: 0.35rem 0.5rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.02);
        }

        .session-main {
          font-size: 0.8rem;
          font-weight: 600;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 0.3rem;
          flex-wrap: wrap;
        }

        .session-time {
          color: #666;
          font-size: 0.75rem;
        }

        .session-dot {
          color: #aaa;
        }

        .session-sub {
          font-size: 0.7rem;
          color: #666666;
          margin-top: 0.15rem;
        }

        .ruled-lines {
          display: flex;
          flex-direction: column;
          justify-content: space-evenly;
          flex: 1;
          padding: 0.5rem 0.5rem 0.2rem 0.5rem;
        }

        .ruled-line {
          border-bottom: 1px dashed #dcd6ce;
          height: 1.8rem;
        }

        .sheet-footer {
          margin-top: auto;
          text-align: center;
          font-size: 0.75rem;
          color: #888888;
          padding-top: 0.5rem;
          border-top: 1px solid #e2ddd7;
        }
      `}</style>
    </div>
  );
};
