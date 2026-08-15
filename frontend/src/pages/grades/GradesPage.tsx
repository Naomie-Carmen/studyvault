import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  Check,
  RefreshCw,
  Award,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import {
  getAverages,
  saveGrades,
  GradeAveragesResponse,
  SemesterGradeSummary,
} from '../../services/gradeService';

export const GradesPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<GradeAveragesResponse | null>(null);
  const [selectedSemNum, setSelectedSemNum] = useState<number | 'annual'>(1);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Input states map: key = `${ecueId}:${noteTypeId}`, value = string
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const saveTimeoutRef = useRef<Record<string, any>>({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAverages();
      if (res.success && res.data) {
        setData(res.data);
        // Populate local inputValues map from server notes
        const initialInputs: Record<string, string> = {};
        res.data.semesters.forEach((sem) => {
          sem.ues.forEach((ue) => {
            ue.ecues.forEach((ecue) => {
              ecue.notes.forEach((n) => {
                const key = `${ecue.ecueId}:${n.noteTypeId}`;
                initialInputs[key] = n.value !== null && n.value !== undefined ? String(n.value) : '';
              });
            });
          });
        });
        setInputValues(initialInputs);
      }
    } catch (_err) {
      console.error('[GradesPage] Error loading averages:', _err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle note value change with 500ms debounce auto-save
  const handleGradeInputChange = (
    ecueId: string,
    noteTypeId: string,
    valStr: string,
    allEcueNoteTypes: { noteTypeId: string }[]
  ) => {
    const key = `${ecueId}:${noteTypeId}`;
    setInputValues((prev) => ({ ...prev, [key]: valStr }));
    setSaveStatus('saving');

    if (saveTimeoutRef.current[ecueId]) {
      clearTimeout(saveTimeoutRef.current[ecueId]);
    }

    saveTimeoutRef.current[ecueId] = setTimeout(async () => {
      // Gather current state for this ecueId
      const notesToSave = allEcueNoteTypes.map((nt) => {
        const k = `${ecueId}:${nt.noteTypeId}`;
        const rawVal = k === key ? valStr : inputValues[k] || '';
        const numVal = rawVal.trim() === '' ? null : parseFloat(rawVal.replace(',', '.'));
        return {
          noteTypeId: nt.noteTypeId,
          value: numVal !== null && !isNaN(numVal) ? Math.min(20, Math.max(0, numVal)) : null,
        };
      });

      try {
        await saveGrades(ecueId, notesToSave);
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
        // Refresh DTO calculations
        const res = await getAverages();
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch (_err) {
        console.error('[GradesPage] Auto-save error:', _err);
        setSaveStatus('idle');
      }
    }, 500);
  };

  const getBadgeColorClass = (avg: number | null) => {
    if (avg === null || avg === undefined) return 'badge-neutral';
    if (avg >= 10.0) return 'badge-green';
    if (avg >= 7.0) return 'badge-orange';
    return 'badge-red';
  };

  const formatAvg = (avg: number | null) => {
    if (avg === null || avg === undefined) return '—';
    return avg.toFixed(2);
  };

  if (loading) {
    return (
      <div className="grades-page-container">
        <div className="loading-state">
          <RefreshCw size={24} className="spinning text-indigo" />
          <span>{t('grades.loading', 'Calcul des moyennes et préparation du carnet de notes…')}</span>
        </div>
      </div>
    );
  }

  const activeSemester: SemesterGradeSummary | undefined =
    selectedSemNum === 'annual'
      ? undefined
      : data?.semesters.find((s) => s.semesterNumber === selectedSemNum) || data?.semesters[0];

  return (
    <div className="grades-page-container">
      {/* Header Page */}
      <div className="page-header" style={{ justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="page-header-icon">
            <Calculator size={24} />
          </div>
          <div className="header-title-box">
            <h1>{t('grades.title', 'Notes & Moyennes')}</h1>
            <p className="subtitle">
              {t(
                'grades.subtitle',
                'Saisissez vos notes /20 pour calculer en direct vos moyennes d\'ECUE, d\'UE, de semestre et d\'année.'
              )}
            </p>
          </div>
        </div>

        {saveStatus === 'saving' && (
          <div className="save-status-badge saving" style={{ marginLeft: 'auto' }}>
            <RefreshCw size={14} className="spinning" />
            <span>{t('grades.saving', 'Enregistrement…')}</span>
          </div>
        )}
        {saveStatus === 'saved' && (
          <div className="save-status-badge saved" style={{ marginLeft: 'auto' }}>
            <Check size={14} />
            <span>{t('grades.saved', 'Enregistré ✓')}</span>
          </div>
        )}
      </div>

      {/* Filter Tabs: Semestre 1 / Semestre 2 / Annuel */}
      <div className="semester-tabs-bar">
        {(data?.semesters || []).map((sem) => (
          <button
            key={sem.semesterId}
            type="button"
            className={`tab-btn ${selectedSemNum === sem.semesterNumber ? 'active' : ''}`}
            onClick={() => setSelectedSemNum(sem.semesterNumber)}
          >
            <span>Semestre {sem.semesterNumber}</span>
            {sem.average !== null && (
              <span className={`tab-avg-badge ${getBadgeColorClass(sem.average)}`}>
                {formatAvg(sem.average)}
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          className={`tab-btn ${selectedSemNum === 'annual' ? 'active' : ''}`}
          onClick={() => setSelectedSemNum('annual')}
        >
          <span>{t('grades.annual', 'Vue Annuelle')}</span>
          {data?.annualAverage !== null && (
            <span className={`tab-avg-badge ${getBadgeColorClass(data?.annualAverage || null)}`}>
              {formatAvg(data?.annualAverage || null)}
            </span>
          )}
        </button>
      </div>

      {/* 3 Stats Indicator Cards */}
      <div className="stats-cards-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon-wrap indigo">
            <TrendingUp size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">
              {selectedSemNum === 'annual'
                ? t('grades.statAnnual', 'Moyenne Annuelle')
                : `Moyenne Semestre ${activeSemester?.semesterNumber || 1}`}
            </span>
            <div className="stat-value-group">
              <span className="stat-value">
                {formatAvg(
                  selectedSemNum === 'annual'
                    ? data?.annualAverage || null
                    : activeSemester?.average || null
                )}
              </span>
              <span className="stat-max">/ 20</span>
              <span
                className={`avg-pill ${getBadgeColorClass(
                  selectedSemNum === 'annual'
                    ? data?.annualAverage || null
                    : activeSemester?.average || null
                )}`}
              >
                {(selectedSemNum === 'annual'
                  ? data?.annualAverage
                  : activeSemester?.average) !== null
                  ? (selectedSemNum === 'annual' ? data?.annualAverage! : activeSemester?.average!) >= 10
                    ? t('grades.statusPassed', 'Validé')
                    : t('grades.statusFailed', 'Ajourné')
                  : t('grades.statusPending', 'En cours')}
              </span>
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrap purple">
            <Award size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{t('grades.statAnnualAvg', 'Moyenne Générale')}</span>
            <div className="stat-value-group">
              <span className="stat-value">{formatAvg(data?.annualAverage || null)}</span>
              <span className="stat-max">/ 20</span>
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon-wrap emerald">
            <CheckCircle2 size={22} />
          </div>
          <div className="stat-info">
            <span className="stat-label">{t('grades.statCredits', 'Crédits Validés (ECTS)')}</span>
            <div className="stat-value-group">
              <span className="stat-value">{data?.totalValidatedCredits || 0}</span>
              <span className="stat-max">/ {data?.totalCredits || 60} ECTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {selectedSemNum === 'annual' ? (
        <div className="annual-overview-container">
          {data?.semesters.map((sem) => (
            <div key={sem.semesterId} className="semester-summary-card glass-card">
              <div className="sem-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <BookOpen size={20} className="text-indigo" />
                  <h3>Semestre {sem.semesterNumber} — {sem.semesterLabel}</h3>
                </div>
                <div className={`sem-avg-badge ${getBadgeColorClass(sem.average)}`}>
                  Moyenne : {formatAvg(sem.average)} / 20
                </div>
              </div>

              <div className="ues-simple-list">
                {sem.ues.map((ue) => (
                  <div key={ue.ueId} className="ue-simple-row">
                    <span className="ue-title">
                      {ue.code ? `[${ue.code}] ` : ''}{ue.title}
                    </span>
                    <span className={`ue-avg-badge ${getBadgeColorClass(ue.average)}`}>
                      {formatAvg(ue.average)} / 20
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="semester-grades-container">
          {activeSemester?.ues.map((ue) => (
            <div key={ue.ueId} className="ue-card glass-card">
              <div className="ue-card-header">
                <div className="ue-info">
                  <span className="ue-code-badge">{ue.code || 'UE'}</span>
                  <h3>{ue.title}</h3>
                  {ue.ects && <span className="ue-ects-tag">{ue.ects} ECTS</span>}
                </div>

                <div className="ue-avg-box">
                  <span className="label">Moyenne UE</span>
                  <span className={`ue-avg-pill ${getBadgeColorClass(ue.average)}`}>
                    {formatAvg(ue.average)} / 20
                  </span>
                </div>
              </div>

              {/* Table of ECUEs */}
              <div className="ecues-table-wrap">
                <table className="ecues-table">
                  <thead>
                    <tr>
                      <th style={{ minWidth: '220px' }}>ECUE / Matière</th>
                      {/* Unique Note Types headers */}
                      {ue.ecues[0]?.notes.map((n) => (
                        <th key={n.noteTypeId} style={{ width: '130px', textAlign: 'center' }}>
                          {data?.mode === 'simple' ? n.noteTypeName : `${n.noteTypeName} (${n.weight}%)`}
                        </th>
                      ))}
                      <th style={{ width: '130px', textAlign: 'center' }}>Moyenne ECUE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ue.ecues.map((ecue) => (
                      <tr key={ecue.ecueId}>
                        <td className="ecue-name-cell">
                          <span className="ecue-title-text">{ecue.title}</span>
                          {ecue.code && <span className="ecue-code-sub">({ecue.code})</span>}
                        </td>

                        {ecue.notes.map((note) => {
                          const inputKey = `${ecue.ecueId}:${note.noteTypeId}`;
                          const currentValStr = inputValues[inputKey] !== undefined
                            ? inputValues[inputKey]
                            : note.value !== null && note.value !== undefined
                            ? String(note.value)
                            : '';

                          return (
                            <td key={note.noteTypeId} className="grade-input-cell">
                              <div className="input-with-max">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max="20"
                                  placeholder="—"
                                  className="grade-input"
                                  value={currentValStr}
                                  onChange={(e) =>
                                    handleGradeInputChange(
                                      ecue.ecueId,
                                      note.noteTypeId,
                                      e.target.value,
                                      ecue.notes
                                    )
                                  }
                                />
                                <span className="max-tag">/20</span>
                              </div>
                            </td>
                          );
                        })}

                        <td className="ecue-avg-cell">
                          <span className={`ecue-avg-badge ${getBadgeColorClass(ecue.average)}`}>
                            {formatAvg(ecue.average)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {(!activeSemester || activeSemester.ues.length === 0) && (
            <div className="empty-state">
              <div className="empty-icon-circle">
                <AlertCircle size={32} />
              </div>
              <h4>{t('grades.emptyTitle', 'Aucune UE enregistrée')}</h4>
              <p>{t('grades.emptySub', 'Importez votre maquette académique pour saisir vos notes.')}</p>
            </div>
          )}
        </div>
      )}

      <style>{`
        .grades-page-container {
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 1300px;
          margin: 0 auto;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 1rem;
          color: var(--text-muted);
        }

        .page-header-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }

        .page-title-badge {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .page-title-badge h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 0;
        }

        .page-subtitle {
          color: var(--text-muted);
          margin-top: 0.25rem;
          font-size: 0.9rem;
        }

        .save-status-badge {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.825rem;
          padding: 0.4rem 0.8rem;
          border-radius: 20px;
          font-weight: 500;
        }
        .save-status-badge.saving {
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .save-status-badge.saved {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }

        .semester-tabs-bar {
          display: flex;
          gap: 0.5rem;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }

        .tab-btn {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          padding: 0.6rem 1.25rem;
          border-radius: 8px;
          background: transparent;
          border: 1px solid transparent;
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .tab-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
        }
        .tab-btn.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
          color: #818cf8;
        }

        .tab-avg-badge {
          font-size: 0.75rem;
          padding: 0.15rem 0.5rem;
          border-radius: 12px;
          font-weight: 700;
        }

        .stats-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.25rem;
        }

        .stat-card {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          border-radius: 12px;
        }

        .stat-icon-wrap {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .stat-icon-wrap.indigo { background: rgba(99, 102, 241, 0.15); color: #818cf8; }
        .stat-icon-wrap.purple { background: rgba(168, 85, 247, 0.15); color: #c084fc; }
        .stat-icon-wrap.emerald { background: rgba(16, 185, 129, 0.15); color: #34d399; }

        .stat-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .stat-label {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .stat-value-group {
          display: flex;
          align-items: baseline;
          gap: 0.35rem;
        }

        .stat-value {
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .stat-max {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .avg-pill {
          margin-left: 0.5rem;
          font-size: 0.725rem;
          padding: 0.2rem 0.55rem;
          border-radius: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .badge-green { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
        .badge-orange { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
        .badge-red { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.4); }
        .badge-neutral { background: rgba(148, 163, 184, 0.15); color: #94a3b8; border: 1px solid rgba(148, 163, 184, 0.3); }

        .semester-grades-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .ue-card {
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .ue-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ue-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .ue-code-badge {
          background: rgba(99, 102, 241, 0.2);
          color: #a5b4fc;
          font-size: 0.75rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
        }

        .ue-info h3 {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
        }

        .ue-ects-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.06);
          padding: 0.15rem 0.45rem;
          border-radius: 4px;
        }

        .ue-avg-box {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }

        .ue-avg-box .label {
          font-size: 0.8rem;
          color: var(--text-muted);
        }

        .ue-avg-pill {
          font-size: 0.95rem;
          font-weight: 800;
          padding: 0.3rem 0.75rem;
          border-radius: 8px;
        }

        .ecues-table-wrap {
          overflow-x: auto;
        }

        .ecues-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        .ecues-table th, .ecues-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid var(--border-color);
        }

        .ecues-table th {
          color: var(--text-muted);
          font-weight: 600;
          font-size: 0.8rem;
          text-transform: uppercase;
        }

        .ecue-name-cell {
          display: flex;
          flex-direction: column;
        }

        .ecue-title-text {
          font-weight: 600;
          color: var(--text-primary);
        }

        .ecue-code-sub {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .grade-input-cell {
          text-align: center;
        }

        .input-with-max {
          display: inline-flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.2rem 0.4rem;
          width: 100px;
        }
        .input-with-max:focus-within {
          border-color: #6366f1;
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        .grade-input {
          width: 60px;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-weight: 700;
          font-size: 0.9rem;
          text-align: right;
          outline: none;
        }

        .max-tag {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: 2px;
        }

        .ecue-avg-cell {
          text-align: center;
        }

        .ecue-avg-badge {
          font-size: 0.9rem;
          font-weight: 800;
          padding: 0.25rem 0.6rem;
          border-radius: 6px;
          display: inline-block;
        }

        .annual-overview-container {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .semester-summary-card {
          padding: 1.25rem;
          border-radius: 12px;
        }

        .sem-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .sem-header h3 {
          margin: 0;
          font-size: 1.1rem;
        }

        .sem-avg-badge {
          font-size: 0.9rem;
          font-weight: 700;
          padding: 0.3rem 0.75rem;
          border-radius: 8px;
        }

        .ues-simple-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .ue-simple-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 0.8rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 6px;
        }

        .ue-simple-row .ue-title {
          font-size: 0.875rem;
          font-weight: 500;
        }

        .ue-simple-row .ue-avg-badge {
          font-size: 0.825rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
