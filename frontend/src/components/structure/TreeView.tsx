import React, { useState, useEffect } from 'react';
import { SemesterTree, UE, ECUE, Subject } from '../../types/structure';
import { getAverages, GradeAveragesResponse } from '../../services/gradeService';
import { 
  FolderTree, 
  Layers, 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Edit3, 
  Trash2,
  UserCheck,
  GripVertical
} from 'lucide-react';

export function normalizeStr(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function matchSearch(text: string | null | undefined, query: string): boolean {
  if (!text || !query || !query.trim()) return false;
  return normalizeStr(text).includes(normalizeStr(query.trim()));
}

export const HighlightText: React.FC<{ text: string | null | undefined; query?: string }> = ({ text, query }) => {
  if (!text) return null;
  if (!query || !query.trim()) return <>{text}</>;

  const normQuery = normalizeStr(query.trim());
  const normText = normalizeStr(text);
  const matchIndex = normText.indexOf(normQuery);

  if (matchIndex === -1) return <>{text}</>;

  const before = text.slice(0, matchIndex);
  const match = text.slice(matchIndex, matchIndex + query.trim().length);
  const after = text.slice(matchIndex + query.trim().length);

  return (
    <>
      {before}
      <mark className="search-highlight-mark">
        {match}
      </mark>
      {after}
    </>
  );
};

interface TreeViewProps {
  semesters: SemesterTree[];
  searchQuery?: string;
  onAddUE: (semesterId: string) => void;
  onEditUE: (ue: UE) => void;
  onDeleteUE: (ue: UE) => void;
  onAddECUE: (ueId: string) => void;
  onEditECUE: (ecue: ECUE) => void;
  onDeleteECUE: (ecue: ECUE) => void;
  onAddSubject: (target: { ueId?: string; ecueId?: string }) => void;
  onEditSubject: (subject: Subject) => void;
  onDeleteSubject: (subject: Subject) => void;
  onReorder?: (data: { type: 'ue' | 'ecue'; id: string; newParentId?: string; newIndex: number }) => void;
}

export const TreeView: React.FC<TreeViewProps> = ({
  semesters,
  searchQuery = '',
  onAddUE,
  onEditUE,
  onDeleteUE,
  onAddECUE,
  onEditECUE,
  onDeleteECUE,
  onAddSubject,
  onEditSubject,
  onDeleteSubject,
  onReorder,
}) => {
  const [collapsedSemesters, setCollapsedSemesters] = useState<Record<string, boolean>>({});
  const [collapsedUEs, setCollapsedUEs] = useState<Record<string, boolean>>({});
  const [averagesData, setAveragesData] = useState<GradeAveragesResponse | null>(null);

  // Drag and Drop States
  const [draggedItem, setDraggedItem] = useState<{ type: 'ue' | 'ecue'; id: string; parentId: string } | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{
    targetType: 'ue' | 'ecue' | 'semester';
    targetId: string;
    parentId: string;
    position: 'before' | 'after' | 'inside';
  } | null>(null);

  useEffect(() => {
    getAverages().then((res) => {
      if (res.success && res.data) {
        setAveragesData(res.data);
      }
    });
  }, []);

  // Auto-expand nodes on active search query
  useEffect(() => {
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.trim();
      const newSemCollapsed: Record<string, boolean> = {};
      const newUeCollapsed: Record<string, boolean> = {};

      semesters.forEach((sem) => {
        let semHasMatch = false;

        sem.ues.forEach((ue) => {
          const ueMatchesSelf = matchSearch(ue.code, q) || matchSearch(ue.title, q);
          let ueHasMatch = ueMatchesSelf;

          ue.ecues.forEach((ecue) => {
            const ecueMatchesSelf = matchSearch(ecue.code, q) || matchSearch(ecue.title, q);
            const subMatches = ecue.subjects.some(
              (s) => matchSearch(s.name, q) || matchSearch(s.instructor, q)
            );
            if (ecueMatchesSelf || subMatches) {
              ueHasMatch = true;
            }
          });

          const directSubMatches = ue.directSubjects.some(
            (s) => matchSearch(s.name, q) || matchSearch(s.instructor, q)
          );
          if (directSubMatches) {
            ueHasMatch = true;
          }

          if (ueHasMatch) {
            newUeCollapsed[ue.id] = false;
            semHasMatch = true;
          }
        });

        if (semHasMatch) {
          newSemCollapsed[sem.id] = false;
        }
      });

      setCollapsedSemesters(newSemCollapsed);
      setCollapsedUEs(newUeCollapsed);
    }
  }, [searchQuery, semesters]);

  const getSemAvg = (semNumber: number) => {
    return averagesData?.semesters.find((s) => s.semesterNumber === semNumber)?.average ?? null;
  };

  const getUeAvg = (ueId: string) => {
    for (const sem of averagesData?.semesters || []) {
      const ue = sem.ues.find((u) => u.ueId === ueId);
      if (ue) return ue.average;
    }
    return null;
  };

  const getEcueAvg = (ecueId: string) => {
    for (const sem of averagesData?.semesters || []) {
      for (const ue of sem.ues) {
        const ecue = ue.ecues.find((e) => e.ecueId === ecueId);
        if (ecue) return ecue.average;
      }
    }
    return null;
  };

  const renderBadge = (avg: number | null) => {
    if (avg === null || avg === undefined) return null;
    let badgeClass = 'badge-green';
    if (avg < 7.0) badgeClass = 'badge-red';
    else if (avg < 10.0) badgeClass = 'badge-orange';
    return <span className={`tree-avg-badge ${badgeClass}`}>{avg.toFixed(2)} / 20</span>;
  };

  const toggleSemester = (id: string) => {
    setCollapsedSemesters((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleUE = (id: string) => {
    setCollapsedUEs((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, type: 'ue' | 'ecue', id: string, parentId: string) => {
    e.stopPropagation();
    setDraggedItem({ type, id, parentId });
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverInfo(null);
  };

  const handleUEHeaderDragOver = (e: React.DragEvent, targetUe: UE, semId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem) return;

    if (draggedItem.type === 'ue') {
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? 'before' : 'after';
      setDragOverInfo({ targetType: 'ue', targetId: targetUe.id, parentId: semId, position });
    } else if (draggedItem.type === 'ecue') {
      // Dragging ECUE onto a UE (move into UE)
      setDragOverInfo({ targetType: 'ue', targetId: targetUe.id, parentId: targetUe.id, position: 'inside' });
    }
  };

  const handleUEDrop = (e: React.DragEvent, targetUe: UE, sem: SemesterTree) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || !onReorder) return;

    if (draggedItem.type === 'ue') {
      const indexInSem = sem.ues.findIndex((u) => u.id === targetUe.id);
      const newIndex = dragOverInfo?.position === 'after' ? indexInSem + 1 : indexInSem;
      onReorder({
        type: 'ue',
        id: draggedItem.id,
        newParentId: sem.id,
        newIndex: Math.max(0, newIndex),
      });
    } else if (draggedItem.type === 'ecue') {
      // Move ECUE to end of target UE
      onReorder({
        type: 'ecue',
        id: draggedItem.id,
        newParentId: targetUe.id,
        newIndex: targetUe.ecues.length,
      });
    }
    handleDragEnd();
  };

  const handleSemesterDragOver = (e: React.DragEvent, semId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedItem?.type === 'ue') {
      setDragOverInfo({ targetType: 'semester', targetId: semId, parentId: semId, position: 'inside' });
    }
  };

  const handleSemesterDrop = (e: React.DragEvent, sem: SemesterTree) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || !onReorder) return;

    if (draggedItem.type === 'ue') {
      onReorder({
        type: 'ue',
        id: draggedItem.id,
        newParentId: sem.id,
        newIndex: sem.ues.length,
      });
    }
    handleDragEnd();
  };

  const handleECUEHeaderDragOver = (e: React.DragEvent, targetEcue: ECUE, ueId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.type !== 'ecue') return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'before' : 'after';
    setDragOverInfo({ targetType: 'ecue', targetId: targetEcue.id, parentId: ueId, position });
  };

  const handleECUEDrop = (e: React.DragEvent, targetEcue: ECUE, ue: UE) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || draggedItem.type !== 'ecue' || !onReorder) return;

    const indexInUe = ue.ecues.findIndex((e) => e.id === targetEcue.id);
    const newIndex = dragOverInfo?.position === 'after' ? indexInUe + 1 : indexInUe;

    onReorder({
      type: 'ecue',
      id: draggedItem.id,
      newParentId: ue.id,
      newIndex: Math.max(0, newIndex),
    });
    handleDragEnd();
  };

  const q = searchQuery.trim();

  return (
    <div className="tree-view-root">
      {semesters.map((sem) => {
        const isSemCollapsed = !!collapsedSemesters[sem.id];

        // Filter UEs if searching
        const filteredUEs = sem.ues.filter((ue) => {
          if (!q) return true;
          const ueMatchesSelf = matchSearch(ue.code, q) || matchSearch(ue.title, q);
          if (ueMatchesSelf) return true;

          const ecueMatches = ue.ecues.some(
            (ecue) =>
              matchSearch(ecue.code, q) ||
              matchSearch(ecue.title, q) ||
              ecue.subjects.some((s) => matchSearch(s.name, q) || matchSearch(s.instructor, q))
          );
          const directSubMatches = ue.directSubjects.some(
            (s) => matchSearch(s.name, q) || matchSearch(s.instructor, q)
          );

          return ecueMatches || directSubMatches;
        });

        if (q && filteredUEs.length === 0) {
          return null;
        }

        const isSemDropTarget =
          dragOverInfo?.targetType === 'semester' && dragOverInfo.targetId === sem.id;

        return (
          <div
            key={sem.id}
            className={`semester-tree-node ${!sem.isActive ? 'disabled-semester' : ''} ${
              isSemDropTarget ? 'drop-target-inside' : ''
            }`}
            onDragOver={(e) => handleSemesterDragOver(e, sem.id)}
            onDrop={(e) => handleSemesterDrop(e, sem)}
          >
            {/* Semester Header */}
            <div className="semester-node-header" onClick={() => toggleSemester(sem.id)}>
              <div className="node-title-group">
                <button className="collapse-toggle">
                  {isSemCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
                </button>
                <span className="semester-pill">S{sem.number}</span>
                <span className="semester-label">{sem.label}</span>
                {renderBadge(getSemAvg(sem.number))}
                {!sem.isActive && <span className="inactive-badge">Inactif</span>}
              </div>

              <div className="node-actions" onClick={(e) => e.stopPropagation()}>
                <button
                  className="add-btn btn-ue"
                  onClick={() => onAddUE(sem.id)}
                  title="Ajouter une UE"
                >
                  <Plus size={14} />
                  <span>Ajouter UE</span>
                </button>
              </div>
            </div>

            {/* Semester Content / UEs list */}
            {!isSemCollapsed && (
              <div className="semester-children">
                {filteredUEs.length === 0 ? (
                  <div className="empty-tree-node">
                    <p>Aucune Unité d'Enseignement (UE) créée dans ce semestre.</p>
                    <button className="btn-link" onClick={() => onAddUE(sem.id)}>
                      + Créer la première UE
                    </button>
                  </div>
                ) : (
                  filteredUEs.map((ue) => {
                    const isUECollapsed = !!collapsedUEs[ue.id];
                    const ueMatchesSelf = q ? matchSearch(ue.code, q) || matchSearch(ue.title, q) : false;

                    const isDraggedUE = draggedItem?.type === 'ue' && draggedItem.id === ue.id;
                    const isUeDropOver = dragOverInfo?.targetId === ue.id;
                    const dropClass = isUeDropOver ? `drop-target-${dragOverInfo.position}` : '';

                    const filteredECUEs = ue.ecues.filter((ecue) => {
                      if (!q || ueMatchesSelf) return true;
                      const ecueMatchesSelf = matchSearch(ecue.code, q) || matchSearch(ecue.title, q);
                      const subMatches = ecue.subjects.some(
                        (s) => matchSearch(s.name, q) || matchSearch(s.instructor, q)
                      );
                      return ecueMatchesSelf || subMatches;
                    });

                    const filteredDirectSubjects = ue.directSubjects.filter((sub) => {
                      if (!q || ueMatchesSelf) return true;
                      return matchSearch(sub.name, q) || matchSearch(sub.instructor, q);
                    });

                    return (
                      <div
                        key={ue.id}
                        className={`ue-tree-node ${isDraggedUE ? 'is-dragging' : ''} ${dropClass}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, 'ue', ue.id, sem.id)}
                        onDragEnd={handleDragEnd}
                      >
                        {/* UE Header */}
                        <div
                          className="ue-node-header"
                          onClick={() => toggleUE(ue.id)}
                          onDragOver={(e) => handleUEHeaderDragOver(e, ue, sem.id)}
                          onDrop={(e) => handleUEDrop(e, ue, sem)}
                        >
                          <div className="node-title-group">
                            <span title="Glisser pour réorganiser">
                              <GripVertical size={16} className="drag-handle-icon" />
                            </span>
                            <button className="collapse-toggle">
                              {isUECollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                            </button>
                            <FolderTree size={18} className="text-indigo" />
                            {ue.code && (
                              <span className="code-tag">
                                <HighlightText text={ue.code} query={q} />
                              </span>
                            )}
                            <span className="ue-title">
                              <HighlightText text={ue.title} query={q} />
                            </span>
                            {renderBadge(getUeAvg(ue.id))}
                            {ue.ects && <span className="ects-badge">{ue.ects} ECTS</span>}
                          </div>

                          <div className="node-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="add-btn btn-ecue"
                              onClick={() => onAddECUE(ue.id)}
                              title="Ajouter un ECUE"
                            >
                              <Plus size={13} />
                              <span>ECUE</span>
                            </button>
                            <button
                              className="add-btn btn-subject"
                              onClick={() => onAddSubject({ ueId: ue.id })}
                              title="Ajouter une Matière directe"
                            >
                              <Plus size={13} />
                              <span>Matière</span>
                            </button>
                            <button className="icon-action-btn" onClick={() => onEditUE(ue)}>
                              <Edit3 size={14} />
                            </button>
                            <button className="icon-action-btn btn-delete" onClick={() => onDeleteUE(ue)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* UE Children: ECUEs + Direct Subjects */}
                        {!isUECollapsed && (
                          <div className="ue-children">
                            {/* ECUE List */}
                            {filteredECUEs.map((ecue) => {
                              const ecueMatchesSelf = q ? matchSearch(ecue.code, q) || matchSearch(ecue.title, q) : false;
                              const filteredSubjects = ecue.subjects.filter((sub) => {
                                if (!q || ueMatchesSelf || ecueMatchesSelf) return true;
                                return matchSearch(sub.name, q) || matchSearch(sub.instructor, q);
                              });

                              const isDraggedECUE = draggedItem?.type === 'ecue' && draggedItem.id === ecue.id;
                              const isEcueDropOver = dragOverInfo?.targetId === ecue.id;
                              const ecueDropClass = isEcueDropOver ? `drop-target-${dragOverInfo.position}` : '';

                              return (
                                <div
                                  key={ecue.id}
                                  className={`ecue-tree-node ${isDraggedECUE ? 'is-dragging' : ''} ${ecueDropClass}`}
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, 'ecue', ecue.id, ue.id)}
                                  onDragEnd={handleDragEnd}
                                >
                                  <div
                                    className="ecue-node-header"
                                    onDragOver={(e) => handleECUEHeaderDragOver(e, ecue, ue.id)}
                                    onDrop={(e) => handleECUEDrop(e, ecue, ue)}
                                  >
                                    <div className="node-title-group">
                                      <span title="Glisser pour réorganiser">
                                        <GripVertical size={14} className="drag-handle-icon" />
                                      </span>
                                      <Layers size={16} className="text-purple" />
                                      {ecue.code && (
                                        <span className="code-tag purple">
                                          <HighlightText text={ecue.code} query={q} />
                                        </span>
                                      )}
                                      <span className="ecue-title">
                                        <HighlightText text={ecue.title} query={q} />
                                      </span>
                                      {renderBadge(getEcueAvg(ecue.id))}
                                    </div>

                                    <div className="node-actions">
                                      <button
                                        className="add-btn btn-subject"
                                        onClick={() => onAddSubject({ ecueId: ecue.id })}
                                      >
                                        <Plus size={13} />
                                        <span>Matière</span>
                                      </button>
                                      <button className="icon-action-btn" onClick={() => onEditECUE(ecue)}>
                                        <Edit3 size={14} />
                                      </button>
                                      <button className="icon-action-btn btn-delete" onClick={() => onDeleteECUE(ecue)}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Subjects under ECUE */}
                                  <div className="subjects-container">
                                    {filteredSubjects.map((sub) => (
                                      <div key={sub.id} className="subject-leaf-node">
                                        <div className="node-title-group">
                                          <div
                                            className="color-dot"
                                            style={{ backgroundColor: sub.color || '#6366f1' }}
                                          />
                                          <BookOpen size={15} className="text-cyan" />
                                          <span className="subject-name">
                                            <HighlightText text={sub.name} query={q} />
                                          </span>
                                          {sub.instructor && (
                                            <span className="instructor-tag">
                                              <UserCheck size={12} />
                                              <HighlightText text={sub.instructor} query={q} />
                                            </span>
                                          )}
                                        </div>

                                        <div className="node-actions">
                                          <button className="icon-action-btn" onClick={() => onEditSubject(sub)}>
                                            <Edit3 size={13} />
                                          </button>
                                          <button className="icon-action-btn btn-delete" onClick={() => onDeleteSubject(sub)}>
                                            <Trash2 size={13} />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Direct Subjects under UE (without ECUE) */}
                            {filteredDirectSubjects.map((sub) => (
                              <div key={sub.id} className="subject-leaf-node direct-subject">
                                <div className="node-title-group">
                                  <div
                                    className="color-dot"
                                    style={{ backgroundColor: sub.color || '#6366f1' }}
                                  />
                                  <BookOpen size={15} className="text-cyan" />
                                  <span className="subject-name">
                                    <HighlightText text={sub.name} query={q} />
                                  </span>
                                  {sub.instructor && (
                                    <span className="instructor-tag">
                                      <UserCheck size={12} />
                                      <HighlightText text={sub.instructor} query={q} />
                                    </span>
                                  )}
                                </div>

                                <div className="node-actions">
                                  <button className="icon-action-btn" onClick={() => onEditSubject(sub)}>
                                    <Edit3 size={13} />
                                  </button>
                                  <button className="icon-action-btn btn-delete" onClick={() => onDeleteSubject(sub)}>
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}

      <style>{`
        .tree-view-root {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .search-highlight-mark {
          background-color: rgba(254, 240, 138, 0.35);
          color: #fef08a;
          font-weight: 700;
          padding: 0 3px;
          border-radius: 3px;
        }

        .drag-handle-icon {
          color: var(--text-muted);
          opacity: 0.35;
          cursor: grab;
          transition: opacity 0.2s ease, color 0.2s ease;
        }
        .ue-node-header:hover .drag-handle-icon,
        .ecue-node-header:hover .drag-handle-icon {
          opacity: 1;
          color: #818cf8;
        }

        .is-dragging {
          opacity: 0.35 !important;
          filter: grayscale(0.5);
        }

        .drop-target-inside {
          border: 2px dashed #10b981 !important;
          background: rgba(16, 185, 129, 0.1) !important;
        }

        .drop-target-before {
          border-top: 3px solid #3b82f6 !important;
          box-shadow: 0 -4px 12px rgba(59, 130, 246, 0.4);
        }

        .drop-target-after {
          border-bottom: 3px solid #3b82f6 !important;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        }

        .semester-tree-node,
        .ue-tree-node,
        .ecue-tree-node {
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .semester-tree-node {
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-color);
          overflow: hidden;
        }

        .semester-tree-node.disabled-semester {
          opacity: 0.6;
        }

        .semester-node-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.25rem;
          background: rgba(99, 102, 241, 0.06);
          border-bottom: 1px solid var(--border-color);
          cursor: pointer;
          user-select: none;
        }

        .node-title-group {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex-wrap: wrap;
        }

        .collapse-toggle {
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .semester-pill {
          padding: 0.2rem 0.5rem;
          border-radius: var(--radius-sm);
          background: var(--gradient-primary);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.75rem;
        }

        .semester-label {
          font-weight: 700;
          font-size: 1rem;
          color: var(--text-primary);
        }

        .inactive-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
          background: rgba(239, 68, 68, 0.15);
          color: var(--status-error);
        }

        .node-actions {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          padding: 0.3rem 0.65rem;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          transition: transform var(--transition-fast);
        }

        .add-btn:hover {
          transform: translateY(-1px);
        }

        .btn-ue {
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .btn-ecue {
          background: rgba(168, 85, 247, 0.15);
          color: var(--accent-purple);
          border: 1px solid rgba(168, 85, 247, 0.3);
        }

        .btn-subject {
          background: rgba(6, 182, 212, 0.15);
          color: var(--accent-cyan);
          border: 1px solid rgba(6, 182, 212, 0.3);
        }

        .icon-action-btn {
          color: var(--text-muted);
          padding: 0.3rem;
          border-radius: var(--radius-sm);
          transition: color var(--transition-fast);
        }

        .icon-action-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }

        .icon-action-btn.btn-delete:hover {
          color: var(--status-error);
          background: rgba(239, 68, 68, 0.1);
        }

        .semester-children {
          padding: 0.75rem 1rem 1rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .empty-tree-node {
          padding: 1.5rem;
          text-align: center;
          color: var(--text-muted);
          font-size: 0.85rem;
        }

        .btn-link {
          color: var(--primary);
          font-weight: 600;
          margin-top: 0.5rem;
          text-decoration: underline;
        }

        .ue-tree-node {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          background: rgba(0, 0, 0, 0.2);
          overflow: hidden;
        }

        .ue-node-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem;
          background: rgba(255, 255, 255, 0.02);
          cursor: pointer;
        }

        .code-tag {
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-sm);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          font-size: 0.725rem;
          font-weight: 700;
        }

        .code-tag.purple {
          background: rgba(168, 85, 247, 0.15);
          color: var(--accent-purple);
        }

        .ue-title {
          font-weight: 600;
          font-size: 0.925rem;
          color: var(--text-primary);
        }

        .ects-badge {
          font-size: 0.7rem;
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-secondary);
        }

        .ue-children {
          padding: 0.5rem 0.75rem 0.75rem 2rem;
          border-top: 1px dashed var(--border-color);
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ecue-tree-node {
          border-left: 2px solid var(--accent-purple);
          padding-left: 0.75rem;
          margin-top: 0.4rem;
        }

        .ecue-node-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.4rem 0;
        }

        .ecue-title {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .subjects-container {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          margin-top: 0.35rem;
          padding-left: 1rem;
        }

        .subject-leaf-node {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.45rem 0.75rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .subject-leaf-node.direct-subject {
          border-left: 2px solid var(--accent-cyan);
        }

        .color-dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 50%;
        }

        .subject-name {
          font-size: 0.85rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .instructor-tag {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.725rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.04);
          padding: 0.15rem 0.45rem;
          border-radius: var(--radius-full);
        }

        .tree-avg-badge {
          font-size: 0.725rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
        }
        .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
        .badge-orange { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }

        .text-indigo { color: var(--primary); }
        .text-purple { color: var(--accent-purple); }
        .text-cyan { color: var(--accent-cyan); }
      `}</style>
    </div>
  );
};
