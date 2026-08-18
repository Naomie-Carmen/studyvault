import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TimetableSession } from '../../types/timetable';
import { getSessionTypeColor } from '../../utils/sessionTypesConfig';
import { Clock, MapPin, AlertTriangle, Copy } from 'lucide-react';

interface TimetableGridProps {
  weekData: Record<number, TimetableSession[]> | null;
  selectedWeekMonday: Date;
  isPastWeek: boolean;
  onOpenSessionDetails: (session: TimetableSession) => void;
  onOpenCreateModal: (params: {
    dayOfWeek: number;
    startTime: string;
    ecueId?: string;
    subjectId?: string;
    sessionType?: string;
    isPerso?: boolean;
  }) => void;
  onMoveSession: (sessionId: string, newDayOfWeek: number, newStartTime: string, newEndTime: string) => void;
  onOpenDuplicateDayModal?: (sourceDay: number) => void;
}

const HOURS_24 = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00');

/**
 * Isolated Now Indicator Line Component
 * Updates its own timer every 60s without re-rendering parent grid.
 */
const NowIndicatorLine: React.FC = React.memo(() => {
  const [nowTime, setNowTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNowTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const nowTotalMinutes = nowTime.getHours() * 60 + nowTime.getMinutes();
  const nowLineTopPx = (nowTotalMinutes / 60) * 56;

  return (
    <div className="line-now" style={{ top: `${nowLineTopPx}px` }}>
      <div className="line-now-dot" />
    </div>
  );
});

NowIndicatorLine.displayName = 'NowIndicatorLine';

/**
 * Memoized Session Card Overlay Component
 */
interface SessionCardOverlayProps {
  session: TimetableSession;
  isPastWeek?: boolean;
  onOpenSessionDetails: (session: TimetableSession) => void;
}

const SessionCardOverlay: React.FC<SessionCardOverlayProps> = React.memo(({
  session,
  isPastWeek = false,
  onOpenSessionDetails,
}) => {
  const style = useMemo(() => {
    const [sh, sm] = session.startTime.split(':').map(Number);
    const [eh, em] = session.endTime.split(':').map(Number);

    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const durationMins = Math.max(30, endMins - startMins);

    const topPx = (startMins / 60) * 56;
    const heightPx = (durationMins / 60) * 56 - 2;

    const sessionColor = session.color || getSessionTypeColor(session.sessionType);

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`,
      borderLeft: `4px solid ${sessionColor}`,
      backgroundColor: `${sessionColor}22`,
    };
  }, [session.startTime, session.endTime, session.color, session.sessionType]);

  const typeColor = useMemo(() => getSessionTypeColor(session.sessionType), [session.sessionType]);

  const handleDragStart = (e: React.DragEvent) => {
    if (isPastWeek) return;
    e.dataTransfer.effectAllowed = 'move';
    const payload = {
      type: 'move-existing-session',
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
    };
    const jsonStr = JSON.stringify(payload);
    try {
      e.dataTransfer.setData('application/json', jsonStr);
      e.dataTransfer.setData('text/plain', jsonStr);
    } catch (_e) {
      /* ignore */
    }
  };

  return (
    <div
      className={`session-card-overlay ${session.hasConflict ? 'conflict' : ''}`}
      style={style}
      draggable={!isPastWeek}
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onOpenSessionDetails(session);
      }}
      title={`${session.subject?.name || session.ecue?.title || 'Séance'} (${session.startTime}–${session.endTime})`}
    >
      <div className="session-card-header">
        <span className="session-type-badge" style={{ backgroundColor: typeColor }}>
          {session.sessionType}
        </span>
        {session.hasConflict && <AlertTriangle size={12} className="conflict-icon" />}
      </div>

      <div className="session-card-title">
        {session.ecue?.code && <span className="ecue-code">[{session.ecue.code}] </span>}
        {session.subject?.name || session.ecue?.title || 'Séance'}
      </div>

      <div className="session-card-footer">
        <span className="time-span">
          {session.startTime}–{session.endTime}
        </span>
        {session.room && (
          <span className="room-span">
            <MapPin size={10} />
            {session.room}
          </span>
        )}
      </div>
    </div>
  );
});

SessionCardOverlay.displayName = 'SessionCardOverlay';

/**
 * Memoized Day Column Component
 */
interface DayColumnProps {
  dayKey: number;
  daySessions: TimetableSession[];
  isTodayColumn: boolean;
  isPastWeek: boolean;
  onOpenSessionDetails: (session: TimetableSession) => void;
  onOpenCreateModal: (params: {
    dayOfWeek: number;
    startTime: string;
    ecueId?: string;
    subjectId?: string;
    sessionType?: string;
    isPerso?: boolean;
  }) => void;
  onMoveSession: (sessionId: string, newDayOfWeek: number, newStartTime: string, newEndTime: string) => void;
}

const DayColumn: React.FC<DayColumnProps> = React.memo(({
  dayKey,
  daySessions,
  isTodayColumn,
  isPastWeek,
  onOpenSessionDetails,
  onOpenCreateModal,
  onMoveSession,
}) => {
  const handleCellDrop = (e: React.DragEvent, hourStr: string) => {
    e.preventDefault();
    if (isPastWeek) return;

    try {
      let rawData = e.dataTransfer.getData('application/json');
      if (!rawData) {
        rawData = e.dataTransfer.getData('text/plain');
      }
      if (rawData) {
        const parsed = JSON.parse(rawData);

        // Case 1: Dragging an existing session to move it
        if (parsed.type === 'move-existing-session' && parsed.sessionId) {
          const [sh, sm] = parsed.startTime.split(':').map(Number);
          const [eh, em] = parsed.endTime.split(':').map(Number);
          const durationMins = Math.max(30, (eh * 60 + em) - (sh * 60 + sm));

          const [newH, newM] = hourStr.split(':').map(Number);
          const newStartMins = newH * 60 + newM;
          const newEndMins = Math.min(24 * 60, newStartMins + durationMins);

          const newEndH = String(Math.floor(newEndMins / 60)).padStart(2, '0');
          const newEndM = String(newEndMins % 60).padStart(2, '0');
          const newEndTimeStr = `${newEndH}:${newEndM}`;

          onMoveSession(parsed.sessionId, dayKey, hourStr, newEndTimeStr);
          return;
        }

        // Case 2: Dragging a personal session block from sidebar
        if (parsed && parsed.isPerso) {
          onOpenCreateModal({
            dayOfWeek: dayKey,
            startTime: hourStr,
            sessionType: parsed.sessionType,
            isPerso: true,
          });
          return;
        }

        // Case 3: Dragging a course from sidebar to create session
        if (parsed && (parsed.ecueId || parsed.subjectId)) {
          onOpenCreateModal({
            dayOfWeek: dayKey,
            startTime: hourStr,
            ecueId: parsed.ecueId,
            subjectId: parsed.subjectId,
          });
        }
      }
    } catch (_err) {
      /* ignore non-JSON plain text */
    }
  };

  const handleCellDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  return (
    <div className={`day-column ${isTodayColumn ? 'today-column' : ''}`}>
      {/* 24 Hour Drop Cell Grid */}
      {HOURS_24.map((hourStr) => (
        <div
          key={hourStr}
          className="hour-cell"
          onDragOver={handleCellDragOver}
          onDrop={(e) => handleCellDrop(e, hourStr)}
          onClick={() => {
            if (!isPastWeek) {
              onOpenCreateModal({ dayOfWeek: dayKey, startTime: hourStr });
            }
          }}
          title={!isPastWeek ? `Cliquer pour ajouter une séance à ${hourStr}` : undefined}
        />
      ))}

      {/* Sessions Overlays */}
      {daySessions.map((session) => (
        <SessionCardOverlay
          key={session.id}
          session={session}
          isPastWeek={isPastWeek}
          onOpenSessionDetails={onOpenSessionDetails}
        />
      ))}

      {/* Isolated Now Line */}
      {isTodayColumn && <NowIndicatorLine />}
    </div>
  );
});

DayColumn.displayName = 'DayColumn';

export const TimetableGrid: React.FC<TimetableGridProps> = React.memo(({
  weekData,
  selectedWeekMonday,
  isPastWeek,
  onOpenSessionDetails,
  onOpenCreateModal,
  onMoveSession,
  onOpenDuplicateDayModal,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrolledRef = useRef<boolean>(false);

  // Auto-scroll to 07:00 AM ONCE on mount
  useEffect(() => {
    if (!scrolledRef.current && containerRef.current) {
      scrolledRef.current = true;
      containerRef.current.scrollTop = 7 * 56;
    }
  }, []);

  const DAYS = useMemo(() => [
    { key: 0, label: t('timetable.days.mon', 'Lundi') },
    { key: 1, label: t('timetable.days.tue', 'Mardi') },
    { key: 2, label: t('timetable.days.wed', 'Mercredi') },
    { key: 3, label: t('timetable.days.thu', 'Jeudi') },
    { key: 4, label: t('timetable.days.fri', 'Vendredi') },
    { key: 5, label: t('timetable.days.sat', 'Samedi') },
    { key: 6, label: t('timetable.days.sun', 'Dimanche') },
  ], [t]);

  // Calculate dates for week header columns
  const dayDateLabels = useMemo(() => {
    return [0, 1, 2, 3, 4, 5, 6].map((dayIndex) => {
      const d = new Date(selectedWeekMonday);
      d.setDate(selectedWeekMonday.getDate() + dayIndex);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    });
  }, [selectedWeekMonday]);

  // Check if selected week is current week
  const { isCurrentWeek, currentDayOfWeekIndex } = useMemo(() => {
    const today = new Date();
    const currentMondayDate = new Date(today);
    const jsDay = today.getDay();
    const diffToMon = today.getDate() - jsDay + (jsDay === 0 ? -6 : 1);
    currentMondayDate.setDate(diffToMon);
    currentMondayDate.setHours(0, 0, 0, 0);

    const isCurrent =
      selectedWeekMonday.getFullYear() === currentMondayDate.getFullYear() &&
      selectedWeekMonday.getMonth() === currentMondayDate.getMonth() &&
      selectedWeekMonday.getDate() === currentMondayDate.getDate();

    const currentDayIdx = today.getDay() === 0 ? 6 : today.getDay() - 1;

    return { isCurrentWeek: isCurrent, currentDayOfWeekIndex: currentDayIdx };
  }, [selectedWeekMonday]);

  return (
    <div className="timetable-24h-grid-wrapper glass-card">
      <div className="grid-scroll-container" ref={containerRef}>
        <div className="grid-table">
          {/* Header Row: Days */}
          <div className="grid-header-row">
            <div className="time-header-cell">
              <Clock size={14} className="text-muted" />
            </div>
            {DAYS.map((day) => {
              const isTodayColumn = isCurrentWeek && day.key === currentDayOfWeekIndex;
              const hasSessions = (weekData?.[day.key]?.length || 0) > 0;
              return (
                <div key={day.key} className={`day-header-cell ${isTodayColumn ? 'today-col' : ''}`}>
                  <div className="header-name-row">
                    <span className="day-name">{day.label}</span>
                    {onOpenDuplicateDayModal && !isPastWeek && hasSessions && (
                      <button
                        type="button"
                        className="btn-header-copy"
                        title={`Dupliquer la journée (${day.label})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDuplicateDayModal(day.key);
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    )}
                  </div>
                  <span className="day-date">{dayDateLabels[day.key]}</span>
                </div>
              );
            })}
          </div>

          {/* Body: 24 Hours Rows */}
          <div className="grid-body-container">
            {/* Time Column */}
            <div className="time-column">
              {HOURS_24.map((hourStr) => (
                <div key={hourStr} className="time-slot-cell">
                  <span>{hourStr}</span>
                </div>
              ))}
            </div>

            {/* 7 Days Columns */}
            {DAYS.map((day) => {
              const daySessions = weekData?.[day.key] || [];
              const isTodayColumn = isCurrentWeek && day.key === currentDayOfWeekIndex;

              return (
                <DayColumn
                  key={day.key}
                  dayKey={day.key}
                  daySessions={daySessions}
                  isTodayColumn={isTodayColumn}
                  isPastWeek={isPastWeek}
                  onOpenSessionDetails={onOpenSessionDetails}
                  onOpenCreateModal={onOpenCreateModal}
                  onMoveSession={onMoveSession}
                />
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        .timetable-24h-grid-wrapper {
          overflow: hidden;
          padding: 0;
          display: flex;
          flex-direction: column;
          border-radius: 12px;
          border: 1px solid var(--border-color);
        }

        .grid-scroll-container {
          max-height: 72vh;
          overflow-y: auto;
          overflow-x: auto;
          position: relative;
        }

        .grid-table {
          display: flex;
          flex-direction: column;
          width: 100%;
          min-width: 0;
        }

        .grid-header-row {
          display: grid;
          grid-template-columns: 50px repeat(7, minmax(0, 1fr));
          position: sticky;
          top: 0;
          z-index: 20;
          background: rgba(15, 23, 42, 0.95);
          backdrop-filter: blur(8px);
          border-bottom: 1px solid var(--border-color);
        }

        .time-header-cell {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-right: 1px solid var(--border-color);
        }

        .day-header-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.5rem;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
          position: relative;
        }

        .header-name-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .btn-header-copy {
          background: transparent;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.15rem;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: all 0.2s ease;
        }

        .btn-header-copy:hover {
          color: #818cf8;
          background: rgba(99, 102, 241, 0.15);
        }

        .day-header-cell.today-col {
          background: rgba(99, 102, 241, 0.15);
          border-bottom: 2px solid #6366f1;
        }

        .day-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .day-date {
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .grid-body-container {
          display: grid;
          grid-template-columns: 50px repeat(7, minmax(0, 1fr));
          position: relative;
        }

        .time-column {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border-color);
          background: rgba(15, 23, 42, 0.4);
        }

        .time-slot-cell {
          height: 56px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 0.2rem;
          font-size: 0.7rem;
          color: var(--text-muted);
          font-weight: 600;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }

        .day-column {
          position: relative;
          display: flex;
          flex-direction: column;
          border-right: 1px solid rgba(255, 255, 255, 0.05);
        }

        .day-column.today-column {
          background: rgba(99, 102, 241, 0.04);
        }

        .hour-cell {
          height: 56px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .hour-cell:hover {
          background: rgba(99, 102, 241, 0.1);
        }

        .session-card-overlay {
          position: absolute;
          left: 3px;
          right: 3px;
          border-radius: 6px;
          padding: 0.35rem 0.5rem;
          z-index: 10;
          cursor: grab;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }
        .session-card-overlay:active {
          cursor: grabbing;
        }
        .session-card-overlay:hover {
          transform: scale(1.02);
          z-index: 15;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .session-card-overlay.conflict {
          border: 1px solid #ef4444 !important;
        }

        .session-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.15rem;
        }

        .session-type-badge {
          font-size: 0.65rem;
          font-weight: 800;
          color: #ffffff;
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
        }

        .conflict-icon {
          color: #ef4444;
        }

        .session-card-title {
          font-size: 0.78rem;
          font-weight: 600;
          color: var(--text-primary);
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ecue-code {
          color: #38bdf8;
          font-weight: 700;
        }

        .session-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.35rem;
          font-size: 0.68rem;
          color: var(--text-secondary);
          margin-top: 0.15rem;
        }

        .room-span {
          display: flex;
          align-items: center;
          gap: 0.2rem;
          color: var(--text-muted);
        }

        .line-now {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: #a855f7;
          box-shadow: 0 0 8px #a855f7;
          z-index: 18;
          pointer-events: none;
        }

        .line-now-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #a855f7;
          position: absolute;
          left: -4px;
          top: -3px;
        }
      `}</style>
    </div>
  );
});

TimetableGrid.displayName = 'TimetableGrid';
