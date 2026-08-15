import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Sliders,
  Plus,
  Trash2,
  Check,
  RefreshCw,
  Search,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import {
  getGradeConfig,
  updateGradeConfig,
  getAverages,
  NoteTypeConfig,
} from '../../services/gradeService';

export const GradeConfigSection: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Global vs Per-ECUE mode
  const [isPerEcueMode, setIsPerEcueMode] = useState<boolean>(false);

  // Default global types
  const [globalTypes, setGlobalTypes] = useState<NoteTypeConfig[]>([
    { name: 'CC', weight: 30 },
    { name: 'TD', weight: 10 },
    { name: 'CM', weight: 60 },
  ]);

  // ECUE selection for override mode
  const [ecuesList, setEcuesList] = useState<{ id: string; title: string; code: string | null }[]>([]);
  const [searchEcue, setSearchEcue] = useState<string>('');
  const [selectedEcueId, setSelectedEcueId] = useState<string>('');
  const [customEcueTypes, setCustomEcueTypes] = useState<NoteTypeConfig[]>([]);

  // Load config & academic structure ECUEs list
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const resConfig = await getGradeConfig();
      if (resConfig.success && resConfig.data) {
        if (resConfig.data.defaultTypes.length > 0) {
          setGlobalTypes(resConfig.data.defaultTypes);
        }
      }

      const resAvg = await getAverages();
      if (resAvg.success && resAvg.data) {
        const extracted: { id: string; title: string; code: string | null }[] = [];
        resAvg.data.semesters.forEach((sem) => {
          sem.ues.forEach((ue) => {
            ue.ecues.forEach((ecue) => {
              extracted.push({
                id: ecue.ecueId,
                title: ecue.title,
                code: ecue.code,
              });
            });
          });
        });
        setEcuesList(extracted);
        if (extracted.length > 0) {
          setSelectedEcueId(extracted[0].id);
        }
      }
    } catch (_err) {
      console.error('[GradeConfigSection] Error loading data:', _err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When selected ECUE changes in per-ecue mode, load its custom types if existing
  useEffect(() => {
    if (!selectedEcueId) return;
    getGradeConfig().then((res) => {
      if (res.success && res.data) {
        const specific = res.data.customTypes.filter((c) => c.ecueId === selectedEcueId);
        if (specific.length > 0) {
          setCustomEcueTypes(specific.map((s) => ({ name: s.name, weight: s.weight })));
        } else {
          // Pre-fill with global types
          setCustomEcueTypes([...globalTypes]);
        }
      }
    });
  }, [selectedEcueId, globalTypes]);

  const activeTypes = isPerEcueMode ? customEcueTypes : globalTypes;
  const setActiveTypes = isPerEcueMode ? setCustomEcueTypes : setGlobalTypes;

  const calculateSum = (types: NoteTypeConfig[]) => {
    return types.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
  };

  const currentSum = calculateSum(activeTypes);
  const isValidSum = Math.abs(currentSum - 100) <= 1.0;

  const handleAddType = () => {
    setActiveTypes([...activeTypes, { name: '', weight: 0 }]);
  };

  const handleRemoveType = (index: number) => {
    if (activeTypes.length <= 1) return;
    const updated = [...activeTypes];
    updated.splice(index, 1);
    setActiveTypes(updated);
  };

  const handleTypeChange = (index: number, field: 'name' | 'weight', val: any) => {
    const updated = [...activeTypes];
    if (field === 'weight') {
      updated[index].weight = parseFloat(val) || 0;
    } else {
      updated[index].name = val;
    }
    setActiveTypes(updated);
  };

  const handleResetDefault = () => {
    const defaults = [
      { name: 'CC', weight: 30 },
      { name: 'TD', weight: 10 },
      { name: 'CM', weight: 60 },
    ];
    setActiveTypes(defaults);
  };

  const handleSave = async () => {
    if (!isValidSum) {
      setMessage({
        type: 'error',
        text: `La somme des coefficients doit être de 100% (actuel : ${currentSum}%).`,
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const targetEcueId = isPerEcueMode ? selectedEcueId : null;
      const res = await updateGradeConfig(targetEcueId, activeTypes);

      if (res.success) {
        setMessage({
          type: 'success',
          text: isPerEcueMode
            ? 'Barème spécifique à la matière enregistré !'
            : 'Barème par défaut enregistré !',
        });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({
          type: 'error',
          text: res.error?.message || 'Erreur lors de la sauvegarde.',
        });
      }
    } catch (_err) {
      setMessage({ type: 'error', text: 'Impossible de joindre le serveur.' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEcues = ecuesList.filter(
    (e) =>
      e.title.toLowerCase().includes(searchEcue.toLowerCase()) ||
      (e.code && e.code.toLowerCase().includes(searchEcue.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="glass-card settings-card">
        <div className="card-header">
          <Sliders size={22} className="section-icon" />
          <div>
            <h3>Barème de notation</h3>
            <p>Chargement de la configuration…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card settings-card">
      <div className="card-header">
        <Sliders size={22} className="section-icon" />
        <div>
          <h3>{t('settings.grades.title', '📊 Barème de notation')}</h3>
          <p>
            {t(
              'settings.grades.desc',
              'Définissez les coefficients des évaluations (CC, TD, CM, TP…) appliqués pour le calcul des moyennes.'
            )}
          </p>
        </div>
      </div>

      {/* Mode Switch Toggle */}
      <div className="mode-toggle-group">
        <button
          type="button"
          className={`mode-btn ${!isPerEcueMode ? 'active' : ''}`}
          onClick={() => setIsPerEcueMode(false)}
        >
          {t('settings.grades.globalMode', 'Même barème pour toutes les matières')}
        </button>
        <button
          type="button"
          className={`mode-btn ${isPerEcueMode ? 'active' : ''}`}
          onClick={() => setIsPerEcueMode(true)}
        >
          {t('settings.grades.perEcueMode', 'Barème personnalisé par matière')}
        </button>
      </div>

      {/* Per-ECUE selector */}
      {isPerEcueMode && (
        <div className="ecue-selector-box">
          <div className="search-input-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Rechercher une matière / ECUE…"
              value={searchEcue}
              onChange={(e) => setSearchEcue(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="ecues-chips-row">
            {filteredEcues.slice(0, 10).map((ecue) => (
              <button
                key={ecue.id}
                type="button"
                className={`ecue-chip ${selectedEcueId === ecue.id ? 'active' : ''}`}
                onClick={() => setSelectedEcueId(ecue.id)}
              >
                <BookOpen size={14} />
                <span>
                  {ecue.code ? `[${ecue.code}] ` : ''}
                  {ecue.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Line Editor */}
      <div className="types-editor-container">
        <div className="editor-header-row">
          <span>Nom du type d'épreuve</span>
          <span>Coefficient (%)</span>
          <span style={{ width: '40px' }} />
        </div>

        <div className="type-rows-list">
          {activeTypes.map((item, idx) => (
            <div key={idx} className="type-row">
              <input
                type="text"
                placeholder="ex: CC, TD, CM, TP..."
                value={item.name}
                onChange={(e) => handleTypeChange(idx, 'name', e.target.value)}
                className="input-name"
              />
              <div className="weight-input-wrap">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="5"
                  value={item.weight}
                  onChange={(e) => handleTypeChange(idx, 'weight', e.target.value)}
                  className="input-weight"
                />
                <span className="unit-tag">%</span>
              </div>
              <button
                type="button"
                className="remove-btn"
                onClick={() => handleRemoveType(idx)}
                disabled={activeTypes.length <= 1}
                title="Supprimer ce type"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Counter and Action bar */}
        <div className="editor-actions-bar">
          <button type="button" className="btn-add-type" onClick={handleAddType}>
            <Plus size={16} />
            <span>Ajouter un type d'épreuve</span>
          </button>

          <button type="button" className="btn-reset-default" onClick={handleResetDefault}>
            <RotateCcw size={14} />
            <span>Réinitialiser (30/10/60)</span>
          </button>

          <div className={`sum-counter-pill ${isValidSum ? 'valid' : 'invalid'}`}>
            Total : {currentSum}% {isValidSum ? '✓' : '⚠️ (100% requis)'}
          </div>
        </div>

        {message && (
          <div className={`form-message-banner ${message.type}`}>
            {message.type === 'success' ? <Check size={16} /> : '⚠️'}
            <span>{message.text}</span>
          </div>
        )}

        <div className="save-button-row">
          <button
            type="button"
            className="btn-save-config"
            onClick={handleSave}
            disabled={saving || !isValidSum}
          >
            {saving ? (
              <>
                <RefreshCw size={16} className="spinning" />
                <span>Enregistrement…</span>
              </>
            ) : (
              <>
                <Check size={16} />
                <span>Enregistrer le barème</span>
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        .mode-toggle-group {
          display: flex;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.4);
          padding: 0.25rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
        }

        .mode-btn {
          flex: 1;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: none;
          background: transparent;
          color: var(--text-muted);
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .mode-btn.active {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        }

        .ecue-selector-box {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          background: rgba(255, 255, 255, 0.02);
          padding: 1rem;
          border-radius: 10px;
          border: 1px solid var(--border-color);
        }

        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.4rem 0.75rem;
        }

        .search-input {
          background: transparent;
          border: none;
          color: var(--text-primary);
          width: 100%;
          font-size: 0.875rem;
          outline: none;
        }

        .ecues-chips-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          max-height: 120px;
          overflow-y: auto;
        }

        .ecue-chip {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .ecue-chip.active {
          background: rgba(99, 102, 241, 0.2);
          border-color: #6366f1;
          color: #a5b4fc;
          font-weight: 600;
        }

        .types-editor-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .editor-header-row {
          display: grid;
          grid-template-columns: 1fr 140px 40px;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--text-muted);
          font-weight: 600;
          text-transform: uppercase;
        }

        .type-rows-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .type-row {
          display: grid;
          grid-template-columns: 1fr 140px 40px;
          gap: 0.75rem;
          align-items: center;
        }

        .input-name {
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.55rem 0.8rem;
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
        }

        .weight-input-wrap {
          display: flex;
          align-items: center;
          background: rgba(15, 23, 42, 0.5);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 0.2rem 0.6rem;
        }

        .input-weight {
          width: 100%;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.9rem;
          font-weight: 700;
          text-align: right;
          outline: none;
        }

        .unit-tag {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin-left: 4px;
        }

        .remove-btn {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 8px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .remove-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .editor-actions-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.5rem;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .btn-add-type, .btn-reset-default {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-primary);
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          font-size: 0.825rem;
          font-weight: 500;
          cursor: pointer;
        }

        .sum-counter-pill {
          padding: 0.45rem 0.85rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 700;
        }
        .sum-counter-pill.valid {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .sum-counter-pill.invalid {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .form-message-banner {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 1rem;
          border-radius: 8px;
          font-size: 0.875rem;
        }
        .form-message-banner.success {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
        }
        .form-message-banner.error {
          background: rgba(239, 68, 68, 0.15);
          color: #f87171;
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .save-button-row {
          display: flex;
          justify-content: flex-end;
          padding-top: 0.5rem;
        }

        .btn-save-config {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          border: none;
          padding: 0.65rem 1.4rem;
          border-radius: 8px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .btn-save-config:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};
