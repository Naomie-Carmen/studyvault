import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { TimetableSession } from '../../types/timetable';
import { AcademicStructureTree } from '../../types/structure';
import * as timetableService from '../../services/timetableService';
import * as structureService from '../../services/academicStructureService';
import { SessionFormModal } from '../../components/timetable/SessionFormModal';
import { SessionDetailsModal } from '../../components/timetable/SessionDetailsModal';
import { TimetableImportModal } from '../../components/timetable/TimetableImportModal';
import { CoursesSidebarDrawer } from '../../components/timetable/CoursesSidebarDrawer';
import { TimetableGrid } from '../../components/timetable/TimetableGrid';
import { PrintWeeklySheet } from '../../components/timetable/PrintWeeklySheet';

import { 
  Calendar as CalendarIcon, 
  Plus, 
  UploadCloud, 
  Printer,
  ChevronLeft,
  ChevronRight,
  Lock,
  Clock
} from 'lucide-react';

type TimetableWeekData = Record<number, TimetableSession[]>;

interface TimetablePageProps {
  onNavigateToDocuments?: (subjectId: string) => void;
}

const getMondayOfDate = (d: Date): Date => {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
};

const formatDateToYYYYMMDD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatWeekSpanLabel = (mondayDate: Date): string => {
  const sundayDate = new Date(mondayDate);
  sundayDate.setDate(mondayDate.getDate() + 6);

  const startStr = mondayDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  const endStr = sundayDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return `Semaine du ${startStr} au ${endStr}`;
};

export const TimetablePage: React.FC<TimetablePageProps> = ({ onNavigateToDocuments }) => {
  const { t } = useTranslation();
  const currentMonday = useMemo(() => getMondayOfDate(new Date()), []);
  const hasSyncedArchivesRef = useRef<boolean>(false);

  const [selectedWeekMonday, setSelectedWeekMonday] = useState<Date>(currentMonday);
  const [weekData, setWeekData] = useState<TimetableWeekData | null>(null);
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [modalCreateParams, setModalCreateParams] = useState<{
    dayOfWeek?: number;
    startTime?: string;
    ecueId?: string;
    subjectId?: string;
    sessionType?: string;
    isPerso?: boolean;
  }>({});

  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  const isCurrentWeek = useMemo(() =>
    selectedWeekMonday.getFullYear() === currentMonday.getFullYear() &&
    selectedWeekMonday.getMonth() === currentMonday.getMonth() &&
    selectedWeekMonday.getDate() === currentMonday.getDate(),
  [selectedWeekMonday, currentMonday]);

  const isPastWeek = useMemo(() => selectedWeekMonday < currentMonday, [selectedWeekMonday, currentMonday]);
  const weekStartStr = useMemo(() => formatDateToYYYYMMDD(selectedWeekMonday), [selectedWeekMonday]);

  const loadData = useCallback(async () => {
    try {
      // Lazy auto-archive past weeks ONCE per session/mount
      if (!hasSyncedArchivesRef.current) {
        hasSyncedArchivesRef.current = true;
        timetableService.syncPastWeekArchives(formatDateToYYYYMMDD(currentMonday)).catch(() => {});
      }

      const [treeRes, liveWeekRes, archiveRes] = await Promise.all([
        structureService.getStructureTree(),
        timetableService.getWeekSessions(),
        isPastWeek ? timetableService.getWeekArchive(weekStartStr) : Promise.resolve(null),
      ]);

      if (treeRes.success && treeRes.data) setTree(treeRes.data);

      let rawSessionsList: TimetableSession[] = [];

      if (isPastWeek && archiveRes && archiveRes.success && archiveRes.data && archiveRes.data.data) {
        rawSessionsList = archiveRes.data.data as TimetableSession[];
      } else if (liveWeekRes.success && liveWeekRes.data) {
        if (Array.isArray(liveWeekRes.data)) {
          rawSessionsList = liveWeekRes.data;
        } else if (typeof liveWeekRes.data === 'object') {
          rawSessionsList = Object.values(liveWeekRes.data).flat() as TimetableSession[];
        }
      }

      const grouped: TimetableWeekData = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
      rawSessionsList.forEach((sess) => {
        if (sess.dayOfWeek >= 0 && sess.dayOfWeek <= 6) {
          grouped[sess.dayOfWeek].push(sess);
        }
      });

      setWeekData(grouped);
    } catch (_e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [selectedWeekMonday, isPastWeek, weekStartStr, currentMonday]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleNavigateWeek = useCallback((offsetWeeks: number) => {
    setSelectedWeekMonday((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + offsetWeeks * 7);
      return next;
    });
  }, []);

  const handleOpenDetails = useCallback((session: TimetableSession) => {
    setSelectedSession(session);
    setIsDetailsOpen(true);
  }, []);

  const handleOpenCreateModal = useCallback((params: {
    dayOfWeek: number;
    startTime: string;
    ecueId?: string;
    subjectId?: string;
    sessionType?: string;
    isPerso?: boolean;
  }) => {
    if (isPastWeek) return;
    setModalCreateParams(params);
    setIsFormOpen(true);
  }, [isPastWeek]);

  const handleToggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev);
  }, []);

  const handleResetToday = useCallback(() => {
    setSelectedWeekMonday(currentMonday);
  }, [currentMonday]);

  const handleMoveSession = useCallback(async (sessionId: string, newDayOfWeek: number, newStartTime: string, newEndTime: string) => {
    try {
      const res = await timetableService.updateSession(sessionId, {
        dayOfWeek: newDayOfWeek,
        startTime: newStartTime,
        endTime: newEndTime,
      });
      if (res.success) {
        loadData();
      }
    } catch (_e) {
      /* ignore */
    }
  }, [loadData]);

  return (
    <div className="timetable-page">
      {/* Top Action Header */}
      <div className="page-header glass-card">
        <div className="header-info-group">
          <div className="page-header-icon">
            <CalendarIcon size={24} />
          </div>
          <div className="header-title-box">
            <h1>{t('timetable.title', 'Planning & Emploi du Temps')}</h1>
            <p className="subtitle">{t('timetable.subtitle', 'Gérez vos séances hebdomadaires et vos révisions.')}</p>
          </div>
        </div>

        <div className="header-actions">
          <button className="btn-print-week" onClick={() => setIsPrintOpen(true)} title={t('timetable.printWeek', 'Visualiser & Imprimer')}>
            <Printer size={16} />
            <span>{t('timetable.printWeek', 'Imprimer / Aperçu')}</span>
          </button>

          <button className="btn-import-file" onClick={() => setIsImportOpen(true)}>
            <UploadCloud size={16} />
            <span>{t('timetable.importBtn', 'Importer PDF/Image (OCR)')}</span>
          </button>

          {!isPastWeek && (
            <button className="btn-add-session" onClick={() => handleOpenCreateModal({ dayOfWeek: 0, startTime: '08:00' })}>
              <Plus size={16} />
              <span>{t('timetable.addSessionBtn', 'Ajouter une séance')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Week Selector Bar */}
      <div className="week-selector-bar glass-card">
        <button className="week-nav-btn" onClick={() => handleNavigateWeek(-1)} title="Semaine précédente">
          <ChevronLeft size={18} />
        </button>

        <div className="week-range-label">
          <CalendarIcon size={16} className="text-indigo" />
          <span className="week-span-text">{formatWeekSpanLabel(selectedWeekMonday)}</span>

          {isPastWeek && <span className="archive-pill">🔒 Archivée (Lecture seule)</span>}
          {isCurrentWeek && <span className="current-pill">✨ Cette semaine</span>}
        </div>

        <button className="week-nav-btn" onClick={() => handleNavigateWeek(1)} title="Semaine suivante">
          <ChevronRight size={18} />
        </button>

        {!isCurrentWeek && (
          <button className="btn-today-reset" onClick={handleResetToday}>
            Aujourd'hui
          </button>
        )}
      </div>

      {/* Past Week Read-Only Banner */}
      {isPastWeek && (
        <div className="past-week-banner glass-card">
          <Lock size={16} className="text-amber" />
          <span>Cette semaine est archivée en lecture seule. Vous pouvez consulter et imprimer l'emploi du temps passé.</span>
        </div>
      )}

      {/* Main Content Layout (Sidebar + 24H Grid) */}
      <div className="timetable-main-layout">
        <CoursesSidebarDrawer
          tree={tree}
          isOpen={isSidebarOpen}
          onToggle={handleToggleSidebar}
          isPastWeek={isPastWeek}
        />

        <div className="timetable-grid-column">
          {loading ? (
            <div className="timetable-loading glass-card">
              <Clock size={24} className="spinning text-indigo" />
              <span>Chargement du planning...</span>
            </div>
          ) : (
            <TimetableGrid
              weekData={weekData}
              selectedWeekMonday={selectedWeekMonday}
              isPastWeek={isPastWeek}
              onOpenSessionDetails={handleOpenDetails}
              onOpenCreateModal={handleOpenCreateModal}
              onMoveSession={handleMoveSession}
            />
          )}
        </div>
      </div>

      {/* Create Session Modal */}
      <SessionFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setModalCreateParams({});
        }}
        onSuccess={loadData}
        initialDayOfWeek={modalCreateParams.dayOfWeek ?? 0}
        initialStartTime={modalCreateParams.startTime ?? '08:00'}
        initialEcueId={modalCreateParams.ecueId}
        initialSubjectId={modalCreateParams.subjectId}
        initialSessionType={modalCreateParams.sessionType}
        initialIsPerso={modalCreateParams.isPerso}
        initialDurationMinutes={90}
        tree={tree}
      />

      {/* Session Details Modal */}
      <SessionDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedSession(null);
        }}
        session={selectedSession}
        onDeleteSuccess={loadData}
        onNavigateToDocuments={onNavigateToDocuments}
      />

      {/* Import OCR Modal */}
      <TimetableImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadData}
      />

      {/* Print Sheet Modal Preview (Hidden on screen unless opened via button) */}
      <PrintWeeklySheet
        weekData={weekData}
        selectedWeekMonday={selectedWeekMonday}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />

      <style>{`
        .timetable-page {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .header-info-group {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .page-header-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .header-title-box h1 {
          font-size: 1.35rem;
          font-weight: 700;
        }

        .header-title-box .subtitle {
          font-size: 0.825rem;
          color: var(--text-muted);
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .btn-print-week, .btn-import-file, .btn-add-session {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-print-week {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
        }
        .btn-print-week:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .btn-import-file {
          background: rgba(6, 182, 212, 0.15);
          border: 1px solid rgba(6, 182, 212, 0.3);
          color: #38bdf8;
        }
        .btn-import-file:hover {
          background: rgba(6, 182, 212, 0.25);
        }

        .btn-add-session {
          background: var(--gradient-primary);
          border: none;
          color: #ffffff;
        }
        .btn-add-session:hover {
          opacity: 0.9;
        }

        .week-selector-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 0.65rem 1.25rem;
          border-radius: 12px;
        }

        .week-nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .week-nav-btn:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        .week-range-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .week-span-text {
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .archive-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.2);
          color: #fbbf24;
          border: 1px solid rgba(245, 158, 11, 0.4);
        }

        .current-pill {
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.4);
        }

        .btn-today-reset {
          padding: 0.25rem 0.65rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.78rem;
          cursor: pointer;
        }
        .btn-today-reset:hover {
          background: rgba(255, 255, 255, 0.2);
          color: var(--text-primary);
        }

        .past-week-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1rem;
          border-radius: 10px;
          background: rgba(245, 158, 11, 0.12);
          border: 1px solid rgba(245, 158, 11, 0.3);
          color: #fde68a;
          font-size: 0.85rem;
        }

        .timetable-main-layout {
          display: flex;
          gap: 1rem;
          align-items: flex-start;
        }

        .timetable-grid-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          min-width: 0;
        }

        .timetable-loading {
          padding: 3rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .text-indigo { color: var(--primary); }
        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
};
