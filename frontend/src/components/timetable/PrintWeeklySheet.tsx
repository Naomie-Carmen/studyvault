import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { TimetableSession } from '../../types/timetable';
import { getSessionTypeColor } from '../../utils/sessionTypesConfig';
import { Printer, LayoutGrid, List, FileSpreadsheet, Smartphone, X } from 'lucide-react';

type TimetableWeekData = Record<number, TimetableSession[]>;

interface PrintWeeklySheetProps {
  weekData: TimetableWeekData | null;
  selectedWeekMonday?: Date;
  isOpen: boolean;
  onClose: () => void;
  defaultStyle?: 'grid24h' | 'compactList';
  defaultOrientation?: 'landscape' | 'portrait';
}

function getWeekRange(refDate?: Date): { mondayStr: string; sundayStr: string; mondayDate: Date; sundayDate: Date } {
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
    mondayDate: monday,
    sundayDate: sunday,
  };
}

function parseTimeToMins(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Convert Hex color to soft pastel background
function hexToPastelBg(hexColor: string): string {
  if (!hexColor || !hexColor.startsWith('#')) return 'rgba(244, 211, 198, 0.35)';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 99;
  const g = parseInt(hex.substring(2, 4), 16) || 102;
  const b = parseInt(hex.substring(4, 6), 16) || 241;
  return `rgba(${r}, ${g}, ${b}, 0.18)`;
}

export const PrintWeeklySheet: React.FC<PrintWeeklySheetProps> = ({
  weekData,
  selectedWeekMonday,
  isOpen,
  onClose,
  defaultStyle = 'grid24h',
  defaultOrientation = 'landscape',
}) => {
  const { t, i18n } = useTranslation();
  const isEn = i18n.language === 'en';

  const [printStyle, setPrintStyle] = useState<'grid24h' | 'compactList'>(defaultStyle);
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>(defaultOrientation);

  const { mondayStr, sundayStr } = useMemo(() => getWeekRange(selectedWeekMonday), [selectedWeekMonday]);

  const DAYS = useMemo(() => [
    { key: 0, label: isEn ? 'Monday' : 'Lundi', short: 'LUN' },
    { key: 1, label: isEn ? 'Tuesday' : 'Mardi', short: 'MAR' },
    { key: 2, label: isEn ? 'Wednesday' : 'Mercredi', short: 'MER' },
    { key: 3, label: isEn ? 'Thursday' : 'Jeudi', short: 'JEU' },
    { key: 4, label: isEn ? 'Friday' : 'Vendredi', short: 'VEN' },
    { key: 5, label: isEn ? 'Saturday' : 'Samedi', short: 'SAM' },
    { key: 6, label: isEn ? 'Sunday' : 'Dimanche', short: 'DIM' },
  ], [isEn]);

  const HOURS_24 = useMemo(() => Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0') + ':00'), []);

  // Collect all COMPO/EXAM sessions for "NE PAS OUBLIER" banner
  const notForgetSessions = useMemo(() => {
    if (!weekData) return [];
    const list: { title: string; dayLabel: string; time: string; type: string }[] = [];
    Object.entries(weekData).forEach(([dayKeyStr, sessions]) => {
      const dayIdx = Number(dayKeyStr);
      const dayObj = DAYS.find((d) => d.key === dayIdx);
      const dayName = dayObj ? dayObj.short : '';

      sessions.forEach((s) => {
        const typeUp = (s.sessionType || '').toUpperCase();
        if (typeUp === 'COMPO' || typeUp === 'EXAM') {
          const name = s.subject?.name || s.ecue?.title || 'Évaluation';
          list.push({
            title: name,
            dayLabel: dayName,
            time: s.startTime,
            type: typeUp,
          });
        }
      });
    });
    return list;
  }, [weekData, DAYS]);

  // Compute total sessions count for page ceiling check
  const totalSessionsCount = useMemo(() => {
    if (!weekData) return 0;
    return Object.values(weekData).reduce((sum, list) => sum + (Array.isArray(list) ? list.length : 0), 0);
  }, [weekData]);

  // Overlap calculation helper for 24h columns
  const getPositionedDaySessions = (dayKey: number) => {
    if (!weekData || !Array.isArray(weekData[dayKey])) return [];
    const sorted = [...weekData[dayKey]].sort((a, b) => parseTimeToMins(a.startTime) - parseTimeToMins(b.startTime));

    // Calculate overlap groups
    const clusters: TimetableSession[][] = [];
    sorted.forEach((sess) => {
      let added = false;
      for (const cluster of clusters) {
        const hasOverlap = cluster.some((item) => {
          const s1 = parseTimeToMins(sess.startTime);
          const e1 = parseTimeToMins(sess.endTime);
          const s2 = parseTimeToMins(item.startTime);
          const e2 = parseTimeToMins(item.endTime);
          return Math.max(s1, s2) < Math.min(e1, e2);
        });
        if (hasOverlap) {
          cluster.push(sess);
          added = true;
          break;
        }
      }
      if (!added) {
        clusters.push([sess]);
      }
    });

    const positioned: {
      session: TimetableSession;
      topPercent: number;
      heightPercent: number;
      leftPercent: number;
      widthPercent: number;
      overflowCount?: number;
      hidden?: boolean;
    }[] = [];

    clusters.forEach((cluster) => {
      const count = cluster.length;
      cluster.forEach((sess, idx) => {
        const startMins = parseTimeToMins(sess.startTime);
        const endMins = parseTimeToMins(sess.endTime);
        const durationMins = Math.max(20, endMins - startMins);

        const topPercent = (startMins / 1440) * 100;
        const heightPercent = (durationMins / 1440) * 100;

        if (count <= 3) {
          positioned.push({
            session: sess,
            topPercent,
            heightPercent,
            widthPercent: 100 / count,
            leftPercent: idx * (100 / count),
          });
        } else {
          if (idx < 3) {
            positioned.push({
              session: sess,
              topPercent,
              heightPercent,
              widthPercent: 33.33,
              leftPercent: idx * 33.33,
              overflowCount: idx === 2 ? count - 3 : undefined,
            });
          } else {
            positioned.push({
              session: sess,
              topPercent,
              heightPercent,
              widthPercent: 33.33,
              leftPercent: 66.66,
              hidden: true,
            });
          }
        }
      });
    });

    return positioned;
  };

  const getSortedDaySessions = (dayKey: number): TimetableSession[] => {
    if (!weekData || !Array.isArray(weekData[dayKey])) return [];
    return [...weekData[dayKey]].sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="print-modal-backdrop no-print-backdrop">
      <div className="print-modal-dialog glass-card">
        {/* Modal Header Bar */}
        <div className="print-modal-header no-print">
          <div className="title-group">
            <Printer size={20} className="text-indigo" />
            <h3>{t('print.modalTitle', 'Aperçu & Impression — Ma Semaine')}</h3>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose} title="Fermer">
            <X size={18} />
          </button>
        </div>

        {/* Top Options Controls Bar */}
        <div className="print-controls-bar no-print">
          <div className="controls-group">
            <label className="control-label">{t('print.orientationLabel', 'Orientation :')}</label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${orientation === 'landscape' ? 'active' : ''}`}
                onClick={() => setOrientation('landscape')}
              >
                <FileSpreadsheet size={14} />
                <span>{t('print.landscapeGrid', 'Paysage (Grille 24h)')}</span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${orientation === 'portrait' ? 'active' : ''}`}
                onClick={() => setOrientation('portrait')}
              >
                <Smartphone size={14} />
                <span>{t('print.portraitOriginal', 'Portrait (Format d\'origine)')}</span>
              </button>
            </div>
          </div>

          <div className="controls-group">
            <label className="control-label">{t('print.styleLabel', 'Style :')}</label>
            <div className="segmented-control">
              <button
                type="button"
                className={`segmented-btn ${printStyle === 'grid24h' ? 'active' : ''}`}
                onClick={() => setPrintStyle('grid24h')}
              >
                <LayoutGrid size={14} />
                <span>{t('print.styleTheme', 'Thème Ma Semaine')}</span>
              </button>
              <button
                type="button"
                className={`segmented-btn ${printStyle === 'compactList' ? 'active' : ''}`}
                onClick={() => setPrintStyle('compactList')}
              >
                <List size={14} />
                <span>{t('print.styleCompactList', 'Liste compacte')}</span>
              </button>
            </div>
          </div>

          <button type="button" className="btn-print-now" onClick={handleTriggerPrint}>
            <Printer size={16} />
            <span>{t('print.printBtn', 'Imprimer / Exporter PDF')}</span>
          </button>
        </div>

        {/* Scrollable Preview Canvas Container */}
        <div className="print-preview-scroll-body">
          <div className={`print-weekly-sheet-root ${orientation}`}>
            <div className={`printable-content-wrapper ${orientation}`}>
              {printStyle === 'compactList' ? (
                /* ==================== COMPACT LIST TEMPLATE ==================== */
                <div className="compact-list-template sheet-inner">
                  <div className="sheet-header">
                    <div className="week-dates-box">
                      <span className="date-line"><strong>{t('print.from', 'DU :')}</strong> {mondayStr}</span>
                      <span className="date-line"><strong>{t('print.to', 'AU :')}</strong> {sundayStr}</span>
                    </div>
                    <div className="title-box">
                      <h1 className="planner-title">{t('print.title', 'Ma Semaine')}</h1>
                      <svg className="flourish-svg" width="120" height="12" viewBox="0 0 120 12" fill="none">
                        <path d="M2 6 C30 1, 45 11, 60 6 C75 1, 90 11, 118 6" stroke="#d5afa6" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div className="ribbon-badge">
                      <span>PLANNER</span>
                    </div>
                  </div>

                  <div className="compact-grid">
                    {DAYS.map((day) => {
                      const daySessions = getSortedDaySessions(day.key);
                      return (
                        <div key={day.key} className="compact-day-card">
                          <h3 className="day-card-title">{day.label}</h3>
                          <div className="compact-sessions-list">
                            {daySessions.length === 0 ? (
                              <div className="empty-day-placeholder" />
                            ) : (
                              daySessions.map((sess) => {
                                const typeColor = sColor(sess);
                                return (
                                  <div key={sess.id} className="compact-session-row" style={{ borderLeftColor: typeColor }}>
                                    <div className="sess-time">{sess.startTime}–{sess.endTime}</div>
                                    <div className="sess-title">{sess.subject?.name || sess.ecue?.title || 'Séance'}</div>
                                    {sess.room && <div className="sess-room">📍 {sess.room}</div>}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div className="compact-day-card not-forget-card">
                      <h3 className="day-card-title not-forget-title">{t('print.doNotForget', 'NE PAS OUBLIER')}</h3>
                      {notForgetSessions.length > 0 && (
                        <div className="not-forget-items-list">
                          {notForgetSessions.map((nf, i) => (
                            <span key={i} className="nf-item-chip">
                              📌 {nf.title} ({nf.type}, {nf.dayLabel} {nf.time})
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="ruled-wavy-lines">
                        <div className="ruled-line" />
                        <div className="ruled-line" />
                        <div className="ruled-line" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : orientation === 'landscape' ? (
                /* ==================== V2: 24H LANDSCAPE GRID TEMPLATE ==================== */
                <div className="grid24h-landscape-template sheet-inner">
                  {/* Header */}
                  <div className="sheet-header">
                    <div className="week-dates-box">
                      <span className="date-line"><strong>{t('print.from', 'DU :')}</strong> {mondayStr}</span>
                      <span className="date-line"><strong>{t('print.to', 'AU :')}</strong> {sundayStr}</span>
                    </div>

                    <div className="title-box">
                      <h1 className="planner-title">{t('print.title', 'Ma Semaine')}</h1>
                      <svg className="flourish-svg" width="140" height="14" viewBox="0 0 140 14" fill="none">
                        <path d="M2 7 C35 1, 52 13, 70 7 C88 1, 105 13, 138 7" stroke="#cfa69c" strokeWidth="1.8" strokeLinecap="round"/>
                      </svg>
                    </div>

                    <div className="pink-ribbon-corner">
                      <svg width="70" height="70" viewBox="0 0 100 100" fill="none">
                        <path d="M50 40 C35 15, 10 28, 38 48 C8 68, 32 80, 50 56 C68 80, 92 68, 62 48 C90 28, 65 15, 50 40 Z" fill="#F2C4B7" opacity="0.9"/>
                        <circle cx="50" cy="48" r="6" fill="#E2A697" />
                        <path d="M46 53 C38 72, 22 88, 14 92 C22 84, 40 68, 48 56 Z" fill="#E2A697" opacity="0.95"/>
                        <path d="M54 53 C62 72, 78 88, 86 92 C78 84, 60 68, 52 56 Z" fill="#E2A697" opacity="0.95"/>
                      </svg>
                    </div>
                  </div>

                  {/* 24h Grid Body */}
                  <div className="grid-landscape-body">
                    {/* Day Headers Row */}
                    <div className="day-headers-row">
                      <div className="time-header-cell">{t('print.hours', 'Heures')}</div>
                      {DAYS.map((d) => (
                        <div key={d.key} className="day-header-cell">
                          {d.label}
                        </div>
                      ))}
                    </div>

                    {/* 24h Grid Matrix */}
                    <div className="grid-matrix-container">
                      {/* Left Hours Column */}
                      <div className="hours-left-column">
                        {HOURS_24.map((h, i) => (
                          <div key={i} className="hour-time-label">
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>

                      {/* 7 Day Columns */}
                      <div className="days-columns-wrapper">
                        {/* Horizontal Hour Lines Background */}
                        <div className="hour-lines-bg">
                          {HOURS_24.map((_, i) => (
                            <div key={i} className="hour-line-row">
                              <div className="half-hour-dotted-line" />
                            </div>
                          ))}
                        </div>

                        {/* Columns Overlay */}
                        <div className="days-columns-overlay">
                          {DAYS.map((day) => {
                            const positionedSessions = getPositionedDaySessions(day.key);
                            return (
                              <div key={day.key} className="day-column-cell">
                                {positionedSessions.map(({ session, topPercent, heightPercent, leftPercent, widthPercent, overflowCount, hidden }, idx) => {
                                  if (hidden) return null;
                                  const typeColor = sColor(session);
                                  const pastelBg = hexToPastelBg(typeColor);
                                  const titleText = session.subject?.name || session.ecue?.title || 'Séance';

                                  return (
                                    <div
                                      key={session.id || idx}
                                      className="landscape-session-block"
                                      style={{
                                        top: `${topPercent}%`,
                                        height: `${heightPercent}%`,
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`,
                                        backgroundColor: pastelBg,
                                        borderColor: typeColor,
                                      }}
                                    >
                                      <div className="session-block-text" style={{ color: '#2c2c2c' }}>
                                        <strong>{session.startTime}–{session.endTime}</strong> · <span className="sess-type-tag" style={{ color: typeColor }}>{session.sessionType}</span> {titleText} {session.room ? `· ${session.room}` : ''}
                                      </div>
                                      {overflowCount && overflowCount > 0 && (
                                        <span className="overflow-badge">+{overflowCount}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Banner: NE PAS OUBLIER */}
                  <div className="bottom-banner-not-forget">
                    <div className="not-forget-header">
                      <span className="nf-title">📌 {t('print.doNotForget', 'NE PAS OUBLIER')} :</span>
                      {notForgetSessions.length > 0 ? (
                        <div className="nf-sessions-inline">
                          {notForgetSessions.map((nf, i) => (
                            <span key={i} className="nf-tag">
                              <strong>{nf.title}</strong> ({nf.type} - {nf.dayLabel} {nf.time})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="nf-empty-hint">{isEn ? "No exam or composition scheduled this week." : "Aucune composition ni examen cette semaine."}</span>
                      )}
                      {totalSessionsCount > 40 && (
                        <span className="suite-page-badge">📄 Page 1 / 2 (Suite sur Page 2)</span>
                      )}
                    </div>

                    <div className="wavy-lines-container">
                      <svg width="100%" height="18" viewBox="0 0 500 18" preserveAspectRatio="none" fill="none">
                        <path d="M0 4 Q 15 0, 30 4 T 60 4 T 90 4 T 120 4 T 150 4 T 180 4 T 210 4 T 240 4 T 270 4 T 300 4 T 330 4 T 360 4 T 390 4 T 420 4 T 450 4 T 480 4 T 500 4" stroke="#cfa69c" strokeWidth="1" opacity="0.7" />
                        <path d="M0 10 Q 15 6, 30 10 T 60 10 T 90 10 T 120 10 T 150 10 T 180 10 T 210 10 T 240 10 T 270 10 T 300 10 T 330 10 T 360 10 T 390 10 T 420 10 T 450 10 T 480 10 T 500 10" stroke="#cfa69c" strokeWidth="1" opacity="0.7" />
                        <path d="M0 16 Q 15 12, 30 16 T 60 16 T 90 16 T 120 16 T 150 16 T 180 16 T 210 16 T 240 16 T 270 16 T 300 16 T 330 16 T 360 16 T 390 16 T 420 16 T 450 16 T 480 16 T 500 16" stroke="#cfa69c" strokeWidth="1" opacity="0.7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                /* ==================== PORTRAIT (FORMAT D'ORIGINE) TEMPLATE ==================== */
                <div className="original-portrait-template sheet-inner">
                  {/* Header */}
                  <div className="sheet-header">
                    <div className="week-dates-box">
                      <span className="date-line"><strong>{t('print.from', 'DU :')}</strong> {mondayStr}</span>
                      <span className="date-line"><strong>{t('print.to', 'AU :')}</strong> {sundayStr}</span>
                    </div>

                    <div className="title-box">
                      <h1 className="planner-title">{t('print.title', 'Ma Semaine')}</h1>
                      <svg className="flourish-svg" width="120" height="12" viewBox="0 0 120 12" fill="none">
                        <path d="M2 6 C30 1, 45 11, 60 6 C75 1, 90 11, 118 6" stroke="#d5afa6" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>

                    <div className="pink-ribbon-corner">
                      <svg width="65" height="65" viewBox="0 0 100 100" fill="none">
                        <path d="M50 40 C35 15, 10 28, 38 48 C8 68, 32 80, 50 56 C68 80, 92 68, 62 48 C90 28, 65 15, 50 40 Z" fill="#F2C4B7" opacity="0.9"/>
                        <circle cx="50" cy="48" r="6" fill="#E2A697" />
                        <path d="M46 53 C38 72, 22 88, 14 92 C22 84, 40 68, 48 56 Z" fill="#E2A697" opacity="0.95"/>
                        <path d="M54 53 C62 72, 78 88, 86 92 C78 84, 60 68, 52 56 Z" fill="#E2A697" opacity="0.95"/>
                      </svg>
                    </div>
                  </div>

                  {/* 3-Row Original Planner Grid Layout */}
                  <div className="planner-3row-grid">
                    {/* Row 1: Lundi, Mardi, Mercredi */}
                    {DAYS.slice(0, 3).map((day) => {
                      const daySessions = getSortedDaySessions(day.key);
                      return (
                        <div key={day.key} className="planner-day-card">
                          <h3 className="day-card-title">{day.label}</h3>
                          <div className="sessions-list-box">
                            {daySessions.length === 0 ? (
                              <div className="empty-day-fill" />
                            ) : (
                              daySessions.map((sess) => {
                                const typeColor = sColor(sess);
                                return (
                                  <div key={sess.id} className="planner-session-item" style={{ borderLeftColor: typeColor }}>
                                    <div className="sess-main-line">
                                      <span className="sess-time-tag">{sess.startTime}–{sess.endTime}</span>
                                      <span className="sess-title-text">{sess.subject?.name || sess.ecue?.title || 'Séance'}</span>
                                    </div>
                                    {(sess.room || sess.sessionType) && (
                                      <div className="sess-sub-line">
                                        <span className="type-badge-inline" style={{ color: typeColor }}>{sess.sessionType}</span>
                                        {sess.room && <span> · Salle {sess.room}</span>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Row 2: Jeudi, Vendredi, Samedi */}
                    {DAYS.slice(3, 6).map((day) => {
                      const daySessions = getSortedDaySessions(day.key);
                      return (
                        <div key={day.key} className="planner-day-card">
                          <h3 className="day-card-title">{day.label}</h3>
                          <div className="sessions-list-box">
                            {daySessions.length === 0 ? (
                              <div className="empty-day-fill" />
                            ) : (
                              daySessions.map((sess) => {
                                const typeColor = sColor(sess);
                                return (
                                  <div key={sess.id} className="planner-session-item" style={{ borderLeftColor: typeColor }}>
                                    <div className="sess-main-line">
                                      <span className="sess-time-tag">{sess.startTime}–{sess.endTime}</span>
                                      <span className="sess-title-text">{sess.subject?.name || sess.ecue?.title || 'Séance'}</span>
                                    </div>
                                    {(sess.room || sess.sessionType) && (
                                      <div className="sess-sub-line">
                                        <span className="type-badge-inline" style={{ color: typeColor }}>{sess.sessionType}</span>
                                        {sess.room && <span> · Salle {sess.room}</span>}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Row 3: Dimanche (1 col) + NE PAS OUBLIER (2 cols wide) */}
                    {(() => {
                      const sunday = DAYS[6];
                      const sundaySessions = getSortedDaySessions(sunday.key);
                      return (
                        <>
                          <div className="planner-day-card">
                            <h3 className="day-card-title">{sunday.label}</h3>
                            <div className="sessions-list-box">
                              {sundaySessions.length === 0 ? (
                                <div className="empty-day-fill" />
                              ) : (
                                sundaySessions.map((sess) => {
                                  const typeColor = sColor(sess);
                                  return (
                                    <div key={sess.id} className="planner-session-item" style={{ borderLeftColor: typeColor }}>
                                      <div className="sess-main-line">
                                        <span className="sess-time-tag">{sess.startTime}–{sess.endTime}</span>
                                        <span className="sess-title-text">{sess.subject?.name || sess.ecue?.title || 'Séance'}</span>
                                      </div>
                                      {(sess.room || sess.sessionType) && (
                                        <div className="sess-sub-line">
                                          <span className="type-badge-inline" style={{ color: typeColor }}>{sess.sessionType}</span>
                                          {sess.room && <span> · Salle {sess.room}</span>}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>

                          <div className="planner-day-card not-forget-card-2cols">
                            <h3 className="day-card-title not-forget-title">📌 {t('print.doNotForget', 'NE PAS OUBLIER')}</h3>
                            {notForgetSessions.length > 0 && (
                              <div className="not-forget-items-list" style={{ marginBottom: '0.5rem' }}>
                                {notForgetSessions.map((nf, i) => (
                                  <span key={i} className="nf-item-chip">
                                    📌 {nf.title} ({nf.type}, {nf.dayLabel} {nf.time})
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="wavy-lines-container" style={{ marginTop: 'auto' }}>
                              <svg width="100%" height="24" viewBox="0 0 400 24" preserveAspectRatio="none" fill="none">
                                <path d="M0 6 Q 20 0, 40 6 T 80 6 T 120 6 T 160 6 T 200 6 T 240 6 T 280 6 T 320 6 T 360 6 T 400 6" stroke="#cfa69c" strokeWidth="1.2" opacity="0.8" />
                                <path d="M0 14 Q 20 8, 40 14 T 80 14 T 120 14 T 160 14 T 200 14 T 240 14 T 280 14 T 320 14 T 360 14 T 400 14" stroke="#cfa69c" strokeWidth="1.2" opacity="0.8" />
                                <path d="M0 22 Q 20 16, 40 22 T 80 22 T 120 22 T 160 22 T 200 22 T 240 22 T 280 22 T 320 22 T 360 22 T 400 22" stroke="#cfa69c" strokeWidth="1.2" opacity="0.8" />
                              </svg>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .print-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: rgba(15, 23, 42, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
        }

        .print-modal-dialog {
          width: 1050px;
          max-width: 95vw;
          max-height: 92vh;
          display: flex;
          flex-direction: column;
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 16px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
          overflow: hidden;
        }

        .print-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .btn-close-modal {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.35rem;
          border-radius: 6px;
        }
        .btn-close-modal:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.15);
        }

        .print-controls-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1.5rem;
          background: rgba(30, 41, 59, 0.8);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          color: #ffffff;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .controls-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .control-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #94a3b8;
        }

        .segmented-control {
          display: inline-flex;
          background: rgba(0, 0, 0, 0.4);
          padding: 2px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .segmented-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.75rem;
          border-radius: 6px;
          border: none;
          background: transparent;
          color: #cbd5e1;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .segmented-btn.active {
          background: #6366f1;
          color: #ffffff;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.4);
        }

        .btn-print-now {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          padding: 0.45rem 1.1rem;
          border-radius: 8px;
          border: none;
          background: var(--gradient-primary, linear-gradient(135deg, #6366f1 0%, #a855f7 100%));
          color: #ffffff;
          font-size: 0.825rem;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
        }

        .print-preview-scroll-body {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          background: #1e293b;
          display: flex;
          justify-content: center;
        }

        .print-weekly-sheet-root {
          font-family: 'Inter', -apple-system, sans-serif;
          color: #2c2c2c;
          background: #F5F0E6;
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          border-radius: 8px;
          overflow: hidden;
          width: 100%;
          max-width: 900px;
        }

        .printable-content-wrapper {
          background-color: #F5F0E6;
          width: 100%;
          box-sizing: border-box;
        }

        .sheet-inner {
          background-color: #F5F0E6;
          padding: 1rem;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }

        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #d8cdb8;
          padding-bottom: 0.35rem;
        }

        .week-dates-box {
          display: flex;
          flex-direction: column;
          font-size: 0.75rem;
          color: #5a5043;
        }

        .planner-title {
          font-family: 'Parisienne', 'Great Vibes', cursive;
          font-size: 2.6rem;
          margin: 0;
          color: #2b2b2b;
          font-weight: 400;
          line-height: 1;
        }

        .title-box {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* 3-ROW PLANNER GRID FORMAT (PORTRAIT FORMAT D'ORIGINE) */
        .planner-3row-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
          flex: 1;
        }

        .planner-day-card {
          background: #faf7f2;
          border: 1px solid #d8cdb8;
          border-radius: 8px;
          padding: 0.6rem;
          display: flex;
          flex-direction: column;
          min-height: 150px;
        }

        .not-forget-card-2cols {
          grid-column: span 2;
        }

        .day-card-title {
          font-family: 'Playfair Display', serif;
          font-size: 0.95rem;
          font-weight: 700;
          text-align: center;
          margin: 0 0 0.5rem 0;
          color: #2c2c2c;
          border-bottom: 1px solid #e8e0d0;
          padding-bottom: 0.3rem;
        }

        .sessions-list-box {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          flex: 1;
        }

        .planner-session-item {
          background: #ffffff;
          border-left: 3px solid #d5afa6;
          border-radius: 4px;
          padding: 0.3rem 0.45rem;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .sess-main-line {
          font-size: 0.78rem;
          font-weight: 600;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          gap: 0.3rem;
        }

        .sess-time-tag {
          color: #666;
          font-size: 0.7rem;
        }

        .sess-title-text {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sess-sub-line {
          font-size: 0.68rem;
          color: #666666;
          margin-top: 0.1rem;
        }

        .type-badge-inline {
          font-weight: 700;
        }

        .empty-day-fill {
          flex: 1;
        }

        /* 24H LANDSCAPE GRID STYLES */
        .grid-landscape-body {
          display: flex;
          flex-direction: column;
          border: 1px solid #d8cdb8;
          border-radius: 6px;
          background: #faf7f2;
          overflow: hidden;
        }

        .day-headers-row {
          display: grid;
          grid-template-columns: 42px repeat(7, 1fr);
          background: #ede6d8;
          border-bottom: 1px solid #d8cdb8;
          font-size: 0.75rem;
          font-weight: 700;
          text-align: center;
        }

        .time-header-cell {
          padding: 0.25rem 0.1rem;
          border-right: 1px solid #d8cdb8;
          color: #7a6e5d;
          font-size: 0.65rem;
        }

        .day-header-cell {
          padding: 0.25rem 0.2rem;
          border-right: 1px solid #d8cdb8;
          color: #2c2c2c;
          font-family: 'Playfair Display', serif;
        }
        .day-header-cell:last-child { border-right: none; }

        .grid-matrix-container {
          display: grid;
          grid-template-columns: 42px 1fr;
          height: 480px;
          position: relative;
        }

        .hours-left-column {
          display: grid;
          grid-template-rows: repeat(24, 1fr);
          border-right: 1px solid #d8cdb8;
          background: #f4eee2;
        }

        .hour-time-label {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          font-size: 6.5pt;
          font-weight: 600;
          color: #6e6252;
          border-bottom: 1px solid #e5dccb;
          padding-top: 1px;
        }

        .days-columns-wrapper {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .hour-lines-bg {
          display: grid;
          grid-template-rows: repeat(24, 1fr);
          position: absolute;
          inset: 0;
        }

        .hour-line-row {
          border-bottom: 1px solid #e5dccb;
          position: relative;
        }

        .half-hour-dotted-line {
          position: absolute;
          top: 50%;
          left: 0;
          right: 0;
          border-top: 1px dotted #ece4d4;
        }

        .days-columns-overlay {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          position: absolute;
          inset: 0;
        }

        .day-column-cell {
          position: relative;
          border-right: 1px solid #e8e0d0;
          height: 100%;
        }
        .day-column-cell:last-child { border-right: none; }

        .landscape-session-block {
          position: absolute;
          box-sizing: border-box;
          border-left-width: 3px;
          border-left-style: solid;
          border-top: 1px solid rgba(0,0,0,0.1);
          border-right: 1px solid rgba(0,0,0,0.1);
          border-bottom: 1px solid rgba(0,0,0,0.1);
          border-radius: 3px;
          padding: 1px 3px;
          overflow: hidden;
          font-size: 6.5pt;
          line-height: 1.15;
          z-index: 2;
        }

        .overflow-badge {
          position: absolute;
          bottom: 1px;
          right: 2px;
          background: #ef4444;
          color: #ffffff;
          font-size: 5.5pt;
          font-weight: 800;
          padding: 0 3px;
          border-radius: 4px;
        }

        .bottom-banner-not-forget {
          margin-top: 0.35rem;
          background: #fcfaf7;
          border: 1px solid #d8cdb8;
          border-radius: 6px;
          padding: 0.4rem 0.6rem;
        }

        .not-forget-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
        }

        .nf-title {
          font-family: 'Playfair Display', serif;
          font-weight: 700;
          color: #7a5c53;
          white-space: nowrap;
        }

        .nf-sessions-inline {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }

        .nf-tag {
          background: #f2e6df;
          color: #5c3a32;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
          font-size: 0.7rem;
        }

        .nf-empty-hint {
          font-size: 0.7rem;
          color: #888888;
          font-style: italic;
        }

        /* PRINT MEDIA OVERRIDES */
        @media print {
          @page {
            size: ${orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: 6mm;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          body * {
            visibility: hidden !important;
          }
          .print-weekly-sheet-root, .print-weekly-sheet-root * {
            visibility: visible !important;
          }
          .print-weekly-sheet-root {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            background: #F5F0E6 !important;
            box-shadow: none !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, .no-print-backdrop, .print-modal-header, .print-controls-bar {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

function sColor(session: TimetableSession): string {
  if (session.color) return session.color;
  return getSessionTypeColor(session.sessionType);
}
