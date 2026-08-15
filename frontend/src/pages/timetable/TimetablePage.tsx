import React, { useState, useEffect } from 'react';
import { TimetableSession } from '../../types/timetable';
import { AcademicStructureTree } from '../../types/structure';

type TimetableWeekData = Record<number, TimetableSession[]>;
import * as timetableService from '../../services/timetableService';
import * as structureService from '../../services/academicStructureService';
import { SessionFormModal } from '../../components/timetable/SessionFormModal';
import { SessionDetailsModal } from '../../components/timetable/SessionDetailsModal';
import { TimetableImportModal } from '../../components/timetable/TimetableImportModal';
import { useTranslation } from 'react-i18next';
import { PrintWeeklySheet } from '../../components/timetable/PrintWeeklySheet';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  UploadCloud, 
  Grid, 
  List, 
  Clock, 
  MapPin, 
  AlertTriangle,
  Printer
} from 'lucide-react';

interface TimetablePageProps {
  onNavigateToDocuments?: (subjectId: string) => void;
}

const DAYS = [
  { key: 0, label: 'Lundi' },
  { key: 1, label: 'Mardi' },
  { key: 2, label: 'Mercredi' },
  { key: 3, label: 'Jeudi' },
  { key: 4, label: 'Vendredi' },
  { key: 5, label: 'Samedi' },
  { key: 6, label: 'Dimanche' },
];

const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export const TimetablePage: React.FC<TimetablePageProps> = ({ onNavigateToDocuments }) => {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [weekData, setWeekData] = useState<TimetableWeekData | null>(null);
  const [tree, setTree] = useState<AcademicStructureTree | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TimetableSession | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [weekRes, treeRes] = await Promise.all([
        timetableService.getWeekSessions(),
        structureService.getStructureTree(),
      ]);
      if (weekRes.success && weekRes.data && typeof weekRes.data === 'object') {
        const normalized: TimetableWeekData = {};
        for (const [k, v] of Object.entries(weekRes.data)) {
          const key = parseInt(k, 10);
          if (!Number.isNaN(key) && Array.isArray(v)) normalized[key] = v as TimetableSession[];
        }
        setWeekData(normalized);
      } else {
        setWeekData(null);
      }
      if (treeRes.success && treeRes.data) setTree(treeRes.data);
    } catch (_e) {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasAnySession =
    !!weekData && DAYS.some((day) => Array.isArray(weekData[day.key]) && weekData[day.key].length > 0);

  const handleOpenDetails = (session: TimetableSession) => {
    setSelectedSession(session);
    setIsDetailsOpen(true);
  };

  return (
    <div className="timetable-page">
      {/* Top Action Header */}
      <div className="page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="page-header-icon">
            <CalendarIcon size={24} />
          </div>
          <div className="header-title-box">
            <h1>Planning &amp; Emploi du Temps</h1>
            <p className="subtitle">Gérez vos séances hebdomadaires et vos révisions.</p>
          </div>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="view-toggle glass-card">
            <button
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Vue Grille Hebdomadaire"
            >
              <Grid size={16} />
              <span>Grille</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Vue Liste Chronologique"
            >
              <List size={16} />
              <span>Liste</span>
            </button>
          </div>

          <button className="btn-print-week" onClick={() => window.print()} title={t('timetable.printWeek', 'Imprimer ma semaine')}>
            <Printer size={16} />
            <span>{t('timetable.printWeek', 'Imprimer ma semaine')}</span>
          </button>

          <button className="btn-import-file" onClick={() => setIsImportOpen(true)}>
            <UploadCloud size={16} />
            <span>Importer PDF/Image (OCR)</span>
          </button>

          <button className="btn-add-session" onClick={() => setIsFormOpen(true)}>
            <Plus size={16} />
            <span>Ajouter une séance</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="timetable-loading glass-card">
          <Clock size={24} className="animate-spin text-indigo" />
          <span>Chargement du planning hebdomadaire...</span>
        </div>
      ) : !hasAnySession ? (
        <div className="empty-state">
          <div className="empty-icon-circle">
            <CalendarIcon size={32} />
          </div>
          <h3>Aucune séance programmée</h3>
          <p>Ajoutez vos cours et révisions manuellement, ou importez votre emploi du temps via l'OCR.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid-container glass-card">
          <div className="grid-header-row">
            <div className="time-col-header">Heures</div>
            {DAYS.map((d) => (
              <div key={d.key} className="day-col-header">
                {d.label}
              </div>
            ))}
          </div>

          <div className="grid-body">
            {TIME_SLOTS.map((time) => (
              <div key={time} className="time-row">
                <div className="time-label">{time}</div>

                {DAYS.map((day) => {
                  const daySessions = Array.isArray(weekData?.[day.key]) ? (weekData as TimetableWeekData)[day.key] : [];
                  const activeSessions = daySessions.filter((s: TimetableSession) => {
                    const startHour = parseInt(s.startTime.split(':')[0], 10);
                    const slotHour = parseInt(time.split(':')[0], 10);
                    return startHour === slotHour;
                  });

                  return (
                    <div key={day.key} className="slot-cell">
                      {activeSessions.map((sess: TimetableSession) => (
                        <div
                          key={sess.id}
                          className={`session-block ${sess.hasConflict ? 'conflict' : ''}`}
                          style={{ borderColor: sess.color || 'var(--primary)' }}
                          onClick={() => handleOpenDetails(sess)}
                        >
                          <div className="block-top">
                            <span className="type-badge">{sess.sessionType}</span>
                            {sess.hasConflict && (
                              <AlertTriangle size={12} className="text-amber" />
                            )}
                          </div>
                          <span className="subject-title">{sess.subject?.name || 'Matière'}</span>
                          <span className="time-span">{sess.startTime} - {sess.endTime}</span>
                          {sess.room && <span className="room-span">{sess.room}</span>}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* List View */
        <div className="list-container">
          {DAYS.map((day) => {
            const daySessions = Array.isArray(weekData?.[day.key]) ? (weekData as TimetableWeekData)[day.key] : [];
            if (daySessions.length === 0) return null;

            return (
              <div key={day.key} className="day-list-card glass-card">
                <h3>{day.label}</h3>
                <div className="day-sessions-list">
                  {daySessions.map((sess: TimetableSession) => (
                    <div
                      key={sess.id}
                      className="list-session-item"
                      onClick={() => handleOpenDetails(sess)}
                    >
                      <span className="list-type">{sess.sessionType}</span>
                      <div className="list-main">
                        <span className="list-subject">{sess.subject?.name || 'Matière'}</span>
                        <div className="list-meta">
                          <span><Clock size={12} /> {sess.startTime} - {sess.endTime}</span>
                          {sess.room && <span><MapPin size={12} /> {sess.room}</span>}
                        </div>
                      </div>
                      {sess.hasConflict && (
                        <span className="badge-conflict"><AlertTriangle size={12} /> Conflit</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Form Modal */}
      <SessionFormModal
        isOpen={isFormOpen}
        tree={tree}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadData}
      />

      {/* Session Details Modal */}
      <SessionDetailsModal
        session={selectedSession}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onDelete={loadData}
        onNavigateToDocuments={onNavigateToDocuments ? (subjectId) => onNavigateToDocuments(subjectId) : () => {}}
      />

      {/* Timetable Import Modal */}
      <TimetableImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSuccess={loadData}
      />

      {/* Printable Weekly Sheet (hidden on screen, visible on print) */}
      <PrintWeeklySheet weekData={weekData} />

      <style>{`
        .timetable-page { display: flex; flex-direction: column; gap: 1.25rem; }
        .timetable-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
        .title-group { display: flex; align-items: center; gap: 0.75rem; }
        .title-group h2 { font-size: 1.35rem; font-weight: 800; }
        .sub-title { font-size: 0.8rem; color: var(--text-muted); }

        .header-actions { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
        .view-toggle { display: flex; padding: 0.2rem; gap: 0.2rem; }
        .toggle-btn { display: flex; align-items: center; gap: 0.3rem; padding: 0.4rem 0.75rem; border-radius: var(--radius-sm); font-size: 0.775rem; font-weight: 600; color: var(--text-muted); }
        .toggle-btn.active { background: var(--gradient-primary); color: #ffffff; }

        .btn-print-week { display: flex; align-items: center; gap: 0.35rem; padding: 0.55rem 0.95rem; border-radius: var(--radius-md); background: rgba(232, 201, 192, 0.18); color: #e8c9c0; font-size: 0.825rem; font-weight: 600; border: 1px solid rgba(232, 201, 192, 0.35); cursor: pointer; transition: all 0.2s ease; }
        .btn-print-week:hover { background: rgba(232, 201, 192, 0.28); transform: translateY(-1px); }

        .btn-import-file { display: flex; align-items: center; gap: 0.35rem; padding: 0.55rem 0.95rem; border-radius: var(--radius-md); background: rgba(99, 102, 241, 0.15); color: var(--primary); font-size: 0.825rem; font-weight: 600; border: 1px solid rgba(99, 102, 241, 0.3); }
        .btn-add-session { display: flex; align-items: center; gap: 0.35rem; padding: 0.55rem 1.15rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-size: 0.825rem; font-weight: 700; box-shadow: var(--shadow-glow); }

        .timetable-loading { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 3rem; font-size: 0.9rem; color: var(--text-muted); }

        .empty-card { padding: 3rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
        .empty-card h3 { font-size: 1.1rem; font-weight: 700; }
        .empty-card p { font-size: 0.85rem; color: var(--text-muted); }

        /* Grid Layout */
        .grid-container { display: flex; flex-direction: column; overflow-x: auto; padding: 1rem; }
        .grid-header-row { display: grid; grid-template-columns: 70px repeat(7, minmax(130px, 1fr)); border-bottom: 1px solid var(--border-color); pb: 0.5rem; text-align: center; font-weight: 700; font-size: 0.85rem; color: var(--text-primary); }
        .time-col-header { color: var(--text-muted); font-size: 0.775rem; }

        .grid-body { display: flex; flex-direction: column; }
        .time-row { display: grid; grid-template-columns: 70px repeat(7, minmax(130px, 1fr)); border-bottom: 1px dashed rgba(255, 255, 255, 0.05); min-height: 70px; }
        .time-label { font-size: 0.75rem; color: var(--text-muted); pt: 0.5rem; font-weight: 600; }

        .slot-cell { padding: 0.25rem; display: flex; flex-direction: column; gap: 0.25rem; border-left: 1px solid rgba(255, 255, 255, 0.03); }

        .session-block {
          padding: 0.45rem; border-radius: var(--radius-sm); background: rgba(99, 102, 241, 0.12);
          border-left: 3px solid var(--primary); cursor: pointer; display: flex; flex-direction: column; gap: 0.15rem; transition: transform 0.2s ease;
        }
        .session-block:hover { transform: translateY(-2px); }
        .session-block.conflict { border-color: #f59e0b; background: rgba(245, 158, 11, 0.15); }

        .block-top { display: flex; align-items: center; justify-content: space-between; }
        .type-badge { font-size: 0.625rem; font-weight: 800; uppercase; color: var(--primary); }
        .subject-title { font-size: 0.8rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .time-span { font-size: 0.7rem; color: var(--text-muted); }
        .room-span { font-size: 0.675rem; color: var(--accent-cyan); font-weight: 600; }

        /* List Layout */
        .list-container { display: flex; flex-direction: column; gap: 1rem; }
        .day-list-card { padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .day-list-card h3 { font-size: 1rem; font-weight: 700; color: var(--text-primary); border-bottom: 1px solid var(--border-color); pb: 0.35rem; }

        .day-sessions-list { display: flex; flex-direction: column; gap: 0.5rem; }
        .list-session-item { display: flex; align-items: center; gap: 0.85rem; padding: 0.65rem 0.85rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-color); cursor: pointer; }
        .list-type { font-size: 0.75rem; font-weight: 800; padding: 0.2rem 0.5rem; border-radius: var(--radius-sm); background: rgba(99, 102, 241, 0.2); color: var(--primary); }
        .list-main { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
        .list-subject { font-size: 0.875rem; font-weight: 700; color: var(--text-primary); }
        .list-meta { display: flex; align-items: center; gap: 0.75rem; font-size: 0.75rem; color: var(--text-muted); }
        .badge-conflict { display: flex; align-items: center; gap: 0.25rem; font-size: 0.725rem; color: #f59e0b; font-weight: 700; }

        .text-indigo { color: var(--primary); }
        .text-amber { color: #f59e0b; }
      `}</style>
    </div>
  );
};
