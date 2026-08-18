import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AcademicStructureTree } from '../../types/structure';
import { GripVertical, ChevronDown, ChevronRight, BookOpen, PanelLeftClose, PanelLeftOpen, Star, Plus } from 'lucide-react';
import { getSessionTypes, saveSessionTypes, SessionTypeConfig } from '../../utils/sessionTypesConfig';

interface CoursesSidebarDrawerProps {
  tree: AcademicStructureTree | null;
  isOpen: boolean;
  onToggle: () => void;
  isPastWeek?: boolean;
}

const PALETTE_8 = [
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ef4444', // Red
  '#84cc16', // Lime
  '#6366f1', // Indigo
];

export const CoursesSidebarDrawer: React.FC<CoursesSidebarDrawerProps> = React.memo(({
  tree,
  isOpen,
  onToggle,
  isPastWeek = false,
}) => {
  const { t } = useTranslation();
  const [expandedUeIds, setExpandedUeIds] = useState<Record<string, boolean>>({});

  const [sessionTypes, setSessionTypesState] = useState<SessionTypeConfig[]>(() => getSessionTypes());
  const [showAddHabit, setShowAddHabit] = useState(false);
  const [habitName, setHabitName] = useState('');
  const [habitColor, setHabitColor] = useState('#ec4899');

  const personalTypes = useMemo(() => {
    return sessionTypes.filter((t) => t.perso);
  }, [sessionTypes]);

  const toggleUe = (ueId: string) => {
    setExpandedUeIds((prev) => ({ ...prev, [ueId]: !prev[ueId] }));
  };

  const handleDragStart = (
    e: React.DragEvent,
    item: { id: string; title: string; code?: string | null; ects?: number | string | null; instructor?: string | null; isEcue: boolean }
  ) => {
    if (isPastWeek) return;
    const payload = {
      ecueId: item.isEcue ? item.id : undefined,
      subjectId: !item.isEcue ? item.id : undefined,
      title: item.title,
      code: item.code,
      instructor: item.instructor,
    };
    const jsonStr = JSON.stringify(payload);
    e.dataTransfer.effectAllowed = 'copy';
    try {
      e.dataTransfer.setData('application/json', jsonStr);
    } catch (_e) {
      /* ignore */
    }
    try {
      e.dataTransfer.setData('text/plain', jsonStr);
    } catch (_e) {
      /* ignore */
    }
  };

  const handlePersoDragStart = (e: React.DragEvent, type: SessionTypeConfig) => {
    if (isPastWeek) return;
    const payload = {
      isPerso: true,
      sessionType: type.id,
      label: type.label,
    };
    const jsonStr = JSON.stringify(payload);
    e.dataTransfer.effectAllowed = 'copy';
    try {
      e.dataTransfer.setData('application/json', jsonStr);
    } catch (_e) {
      /* ignore */
    }
    try {
      e.dataTransfer.setData('text/plain', jsonStr);
    } catch (_e) {
      /* ignore */
    }
  };

  const handleCreateHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!habitName.trim()) return;

    const codeId = habitName.trim().toUpperCase().slice(0, 10);
    const newType: SessionTypeConfig = {
      id: codeId,
      label: habitName.trim(),
      color: habitColor,
      perso: true,
    };

    const updated = [...sessionTypes, newType];
    saveSessionTypes(updated);
    setSessionTypesState(updated);
    setHabitName('');
    setShowAddHabit(false);
  };

  if (!isOpen) {
    return (
      <button className="drawer-collapsed-btn glass-card" onClick={onToggle} title={t('timetable.openCoursesSidebar', 'Ouvrir "Mes cours"')}>
        <PanelLeftOpen size={18} />
        <span>📚 {t('timetable.myCourses', 'Mes cours')}</span>
      </button>
    );
  }

  return (
    <div className="courses-sidebar-drawer glass-card">
      <div className="drawer-header">
        <div className="drawer-title">
          <BookOpen size={18} className="text-indigo" />
          <span>📚 {t('timetable.myCourses', 'Mes cours')}</span>
        </div>
        <button className="drawer-close-btn" onClick={onToggle} title="Fermer le panneau">
          <PanelLeftClose size={16} />
        </button>
      </div>

      <p className="drawer-subtitle">
        {isPastWeek
          ? t('timetable.readOnlyNotice', 'Semaine archivée en lecture seule.')
          : t('timetable.dragInstruction', 'Glissez-déposez un cours ou un bloc perso sur un créneau de la grille 24h.')}
      </p>

      <div className="drawer-tree-container">
        {!tree || tree.semesters.length === 0 ? (
          <div className="empty-tree-notice">
            <span>Aucune UE/ECUE configurée dans l'arborescence.</span>
          </div>
        ) : (
          tree.semesters.map((sem) => (
            <div key={sem.id} className="semester-drawer-group">
              <div className="sem-label">Semestre {sem.number}</div>

              {sem.ues.map((ue) => {
                const isExpanded = expandedUeIds[ue.id] ?? true;
                return (
                  <div key={ue.id} className="ue-drawer-item">
                    <div className="ue-header-row" onClick={() => toggleUe(ue.id)}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="code-tag">{ue.code || 'UE'}</span>
                      <span className="ue-title">{ue.title}</span>
                    </div>

                    {isExpanded && (
                      <div className="ue-children-list">
                        {/* If ECUE = Subject or has ECUEs */}
                        {ue.ecues.map((ecue) => (
                          <div
                            key={ecue.id}
                            className={`course-drag-card ${isPastWeek ? 'disabled' : ''}`}
                            draggable={!isPastWeek}
                            onDragStart={(e) =>
                              handleDragStart(e, {
                                id: ecue.id,
                                title: ecue.title,
                                code: ecue.code,
                                ects: ecue.ects,
                                instructor: ecue.instructor,
                                isEcue: true,
                              })
                            }
                          >
                            <GripVertical size={14} className="drag-handle-icon" />
                            <div className="course-card-content">
                              <div className="card-top-line">
                                {ecue.code && <span className="ecue-code">{ecue.code}</span>}
                                <span className="course-title">{ecue.title}</span>
                              </div>
                              {ecue.ects && Number(ecue.ects) > 0 && (
                                <span className="coef-badge">{ecue.ects} ECTS</span>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Direct subjects if any */}
                        {ue.directSubjects &&
                          ue.directSubjects.map((sub) => (
                            <div
                              key={sub.id}
                              className={`course-drag-card subject-card ${isPastWeek ? 'disabled' : ''}`}
                              draggable={!isPastWeek}
                              onDragStart={(e) =>
                                handleDragStart(e, {
                                  id: sub.id,
                                  title: sub.name,
                                  code: null,
                                  ects: null,
                                  instructor: sub.instructor,
                                  isEcue: false,
                                })
                              }
                            >
                              <GripVertical size={14} className="drag-handle-icon" />
                              <div className="course-card-content">
                                <span className="course-title">{sub.name}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))
        )}

        {/* Section ⭐ Perso under ECUEs */}
        <div className="perso-drawer-group">
          <div className="perso-section-header">
            <div className="header-left">
              <Star size={14} className="text-amber" />
              <span>⭐ {t('timetable.persoSection', 'Perso')}</span>
            </div>
            {!isPastWeek && (
              <button
                type="button"
                className="btn-add-habit-sm"
                onClick={() => setShowAddHabit(!showAddHabit)}
                title="Ajouter une habitude perso en 2 clics"
              >
                <Plus size={12} />
                <span>{t('timetable.addHabitBtn', '+ Habitude')}</span>
              </button>
            )}
          </div>

          {/* Quick Habit Creator Form */}
          {showAddHabit && (
            <form onSubmit={handleCreateHabit} className="add-habit-inline-card glass-card">
              <input
                type="text"
                placeholder={t('timetable.habitPlaceholder', 'Piano, Lecture, Prière...')}
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
                className="habit-name-input"
                autoFocus
                required
              />
              <div className="color-palette-row">
                {PALETTE_8.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot-btn ${habitColor === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setHabitColor(c)}
                  />
                ))}
              </div>
              <div className="habit-card-actions">
                <button type="submit" className="btn-save-habit">
                  Ajouter
                </button>
                <button
                  type="button"
                  className="btn-cancel-habit"
                  onClick={() => setShowAddHabit(false)}
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="perso-blocks-list">
            {personalTypes.map((type) => (
              <div
                key={type.id}
                className={`course-drag-card perso-drag-card ${isPastWeek ? 'disabled' : ''}`}
                draggable={!isPastWeek}
                onDragStart={(e) => handlePersoDragStart(e, type)}
                style={{ borderLeft: `3px solid ${type.color}` }}
              >
                <GripVertical size={14} className="drag-handle-icon" />
                <div className="course-card-content">
                  <div className="card-top-line">
                    <span className="type-badge-mini" style={{ backgroundColor: type.color }}>
                      {type.id}
                    </span>
                    <span className="course-title">{type.label}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .drawer-collapsed-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(30, 41, 59, 0.6);
          color: var(--text-primary);
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          align-self: flex-start;
        }
        .drawer-collapsed-btn:hover {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
        }

        .courses-sidebar-drawer {
          width: 280px;
          min-width: 280px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          max-height: 80vh;
          overflow-y: auto;
          border-radius: 12px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color);
        }

        .drawer-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .drawer-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;
          font-weight: 700;
          color: var(--text-primary);
        }

        .drawer-close-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          padding: 0.2rem;
          border-radius: 4px;
        }
        .drawer-close-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.1);
        }

        .drawer-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
          line-height: 1.3;
        }

        .drawer-tree-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .sem-label {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--primary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.35rem;
        }

        .ue-drawer-item {
          margin-bottom: 0.5rem;
        }

        .ue-header-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 0.25rem 0.35rem;
          border-radius: 4px;
        }
        .ue-header-row:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }

        .code-tag {
          padding: 0.1rem 0.35rem;
          border-radius: 4px;
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          font-size: 0.7rem;
          font-weight: 700;
        }

        .ue-title {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ue-children-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          padding-left: 1rem;
          margin-top: 0.35rem;
        }

        .course-drag-card {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.5rem;
          border-radius: 6px;
          background: rgba(30, 41, 59, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: grab;
          transition: all 0.2s ease;
          user-select: none;
        }
        .course-drag-card:hover:not(.disabled) {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(99, 102, 241, 0.15);
          transform: translateX(2px);
        }
        .course-drag-card.disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .perso-drawer-group {
          margin-top: 0.75rem;
          padding-top: 0.75rem;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
        }

        .perso-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 0.5rem;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #f59e0b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .btn-add-habit-sm {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
          border: 1px solid rgba(236, 72, 153, 0.4);
          background: rgba(236, 72, 153, 0.15);
          color: #f472b6;
          font-size: 0.7rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-add-habit-sm:hover {
          background: rgba(236, 72, 153, 0.3);
          color: #ffffff;
        }

        .add-habit-inline-card {
          padding: 0.65rem;
          margin-bottom: 0.6rem;
          border-radius: 8px;
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(236, 72, 153, 0.4);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .habit-name-input {
          padding: 0.35rem 0.6rem;
          border-radius: 6px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(0, 0, 0, 0.3);
          color: #ffffff;
          font-size: 0.8rem;
          outline: none;
        }

        .color-palette-row {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .color-dot-btn {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid transparent;
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .color-dot-btn.active {
          border-color: #ffffff;
          transform: scale(1.25);
        }

        .habit-card-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.4rem;
        }

        .btn-save-habit {
          padding: 0.2rem 0.6rem;
          border-radius: 4px;
          background: #ec4899;
          color: #ffffff;
          font-size: 0.72rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
        }

        .btn-cancel-habit {
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-muted);
          font-size: 0.72rem;
          border: none;
          cursor: pointer;
        }

        .perso-blocks-list {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .type-badge-mini {
          font-size: 0.65rem;
          font-weight: 700;
          color: #ffffff;
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
        }

        .drag-handle-icon {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .course-card-content {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          flex: 1;
          overflow: hidden;
        }

        .card-top-line {
          display: flex;
          align-items: center;
          gap: 0.35rem;
        }

        .ecue-code {
          font-size: 0.68rem;
          font-weight: 700;
          color: #38bdf8;
        }

        .course-title {
          font-size: 0.78rem;
          font-weight: 500;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .coef-badge {
          font-size: 0.65rem;
          color: var(--text-muted);
        }

        .empty-tree-notice {
          font-size: 0.75rem;
          color: var(--text-muted);
          text-align: center;
          padding: 1rem 0;
        }
      `}</style>
    </div>
  );
});

CoursesSidebarDrawer.displayName = 'CoursesSidebarDrawer';
