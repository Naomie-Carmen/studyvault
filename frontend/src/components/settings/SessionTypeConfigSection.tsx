import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Plus, Trash2, Edit3, Check, RefreshCw, User, GraduationCap } from 'lucide-react';
import {
  getSessionTypes,
  saveSessionTypes,
  SessionTypeConfig,
  DEFAULT_SESSION_TYPES,
} from '../../utils/sessionTypesConfig';

export const SessionTypeConfigSection: React.FC = () => {
  const { t } = useTranslation();
  const [types, setTypes] = useState<SessionTypeConfig[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editPerso, setEditPerso] = useState(false);

  // New type state
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#8b5cf6');
  const [newPerso, setNewPerso] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setTypes(getSessionTypes());
  }, []);

  const handleSaveAll = (updated: SessionTypeConfig[]) => {
    setTypes(updated);
    saveSessionTypes(updated);
  };

  const handleStartEdit = (type: SessionTypeConfig) => {
    setEditingId(type.id);
    setEditLabel(type.label);
    setEditColor(type.color);
    setEditPerso(!!type.perso);
  };

  const handleConfirmEdit = (id: string) => {
    if (!editLabel.trim()) return;
    const updated = types.map((t) =>
      t.id === id ? { ...t, label: editLabel.trim(), color: editColor, perso: editPerso } : t
    );
    handleSaveAll(updated);
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    const updated = types.filter((t) => t.id !== id);
    handleSaveAll(updated);
  };

  const handleAddType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const codeId = newId.trim().toUpperCase() || newLabel.trim().toUpperCase().slice(0, 5);

    if (types.some((t) => t.id.toUpperCase() === codeId)) {
      alert(t('settings.sessionTypes.alreadyExists', 'Ce type de séance existe déjà.'));
      return;
    }

    const newType: SessionTypeConfig = {
      id: codeId,
      label: newLabel.trim(),
      color: newColor,
      perso: newPerso,
    };

    const updated = [...types, newType];
    handleSaveAll(updated);
    setNewId('');
    setNewLabel('');
    setShowAddForm(false);
  };

  const handleResetDefaults = () => {
    handleSaveAll(DEFAULT_SESSION_TYPES);
  };

  return (
    <div className="glass-card settings-card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Calendar size={22} className="section-icon text-indigo" />
          <div>
            <h3>{t('settings.sessionTypes.title', 'Types de Séance & Couleurs')}</h3>
            <p>{t('settings.sessionTypes.desc', 'Personnalisez les types de cours (CM, TD, Compo...) et activités perso (Révision, Sport...)')}</p>
          </div>
        </div>

        <button
          className="btn-secondary-sm"
          onClick={handleResetDefaults}
          title={t('settings.sessionTypes.reset', 'Réinitialiser les types par défaut')}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
        >
          <RefreshCw size={12} />
          <span>{t('settings.sessionTypes.resetBtn', 'Réinitialiser')}</span>
        </button>
      </div>

      <div className="session-types-list">
        {types.map((type) => (
          <div key={type.id} className="type-row-item">
            {editingId === type.id ? (
              <div className="type-edit-mode">
                <input
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="color-input"
                />
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="label-input"
                  placeholder="Intitulé"
                />
                <label className="perso-checkbox-label">
                  <input
                    type="checkbox"
                    checked={editPerso}
                    onChange={(e) => setEditPerso(e.target.checked)}
                  />
                  <span>Perso</span>
                </label>
                <button className="icon-save-btn" onClick={() => handleConfirmEdit(type.id)}>
                  <Check size={14} />
                </button>
              </div>
            ) : (
              <div className="type-view-mode">
                <div className="type-badge" style={{ backgroundColor: type.color }}>
                  {type.id}
                </div>
                <span className="type-label">{type.label}</span>

                <span className={`category-pill ${type.perso ? 'perso' : 'scolaire'}`}>
                  {type.perso ? <User size={10} /> : <GraduationCap size={10} />}
                  <span>{type.perso ? 'Perso' : 'Scolaire'}</span>
                </span>

                <div className="type-actions">
                  <button className="icon-action-btn" onClick={() => handleStartEdit(type)} title="Modifier">
                    <Edit3 size={13} />
                  </button>
                  {!type.isDefault && (
                    <button className="icon-action-btn btn-delete" onClick={() => handleDelete(type.id)} title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {!showAddForm ? (
        <button className="add-type-btn" onClick={() => setShowAddForm(true)}>
          <Plus size={14} />
          <span>{t('settings.sessionTypes.addBtn', 'Ajouter un type de séance (ex: Compo, Sport, Piano...)')}</span>
        </button>
      ) : (
        <form onSubmit={handleAddType} className="add-type-form">
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
            className="color-input"
          />
          <input
            type="text"
            placeholder="Code (ex: PIANO)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            className="code-input"
          />
          <input
            type="text"
            placeholder="Nom complet (ex: Cours de Piano)"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="label-input"
            required
          />
          <label className="perso-checkbox-label">
            <input
              type="checkbox"
              checked={newPerso}
              onChange={(e) => setNewPerso(e.target.checked)}
            />
            <span>Perso</span>
          </label>
          <button type="submit" className="btn-confirm-add">
            Ajouter
          </button>
          <button type="button" className="btn-cancel-add" onClick={() => setShowAddForm(false)}>
            Annuler
          </button>
        </form>
      )}

      <style>{`
        .session-types-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 0.65rem;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }

        .type-row-item {
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
          background: rgba(30, 41, 59, 0.6);
          border: 1px solid var(--border-color);
        }

        .type-view-mode {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.4rem;
        }

        .type-badge {
          padding: 0.2rem 0.5rem;
          border-radius: 6px;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.72rem;
        }

        .type-label {
          font-size: 0.825rem;
          font-weight: 500;
          color: var(--text-primary);
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .category-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.2rem;
          padding: 0.15rem 0.4rem;
          border-radius: 12px;
          font-size: 0.65rem;
          font-weight: 600;
        }
        .category-pill.scolaire {
          background: rgba(99, 102, 241, 0.2);
          color: #818cf8;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .category-pill.perso {
          background: rgba(236, 72, 153, 0.2);
          color: #f472b6;
          border: 1px solid rgba(236, 72, 153, 0.3);
        }

        .type-actions {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .type-edit-mode {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          flex-wrap: wrap;
        }

        .perso-checkbox-label {
          display: inline-flex;
          align-items: center;
          gap: 0.3rem;
          font-size: 0.75rem;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .color-input {
          width: 28px;
          height: 28px;
          border: none;
          border-radius: 4px;
          background: none;
          cursor: pointer;
        }

        .label-input, .code-input {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.3);
          color: var(--text-primary);
          font-size: 0.8rem;
          outline: none;
        }
        .code-input { width: 80px; text-transform: uppercase; }

        .add-type-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: 6px;
          border: 1px dashed rgba(99, 102, 241, 0.4);
          background: rgba(99, 102, 241, 0.1);
          color: #818cf8;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }

        .add-type-form {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          flex-wrap: wrap;
        }

        .btn-confirm-add {
          padding: 0.3rem 0.75rem;
          border-radius: 6px;
          background: var(--gradient-primary);
          color: #ffffff;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .btn-cancel-add {
          padding: 0.3rem 0.65rem;
          border-radius: 6px;
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-muted);
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
};
