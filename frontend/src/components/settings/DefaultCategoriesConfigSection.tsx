import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderTree, Plus, Trash2, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'studyvault_default_categories';
const DEFAULT_CATEGORIES = ['CM', 'TD', 'Sujets'];

export function getDefaultCategories(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CATEGORIES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (_e) {
    /* ignore */
  }
  return DEFAULT_CATEGORIES;
}

export function saveDefaultCategories(categories: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
  } catch (_e) {
    /* ignore */
  }
}

export const DefaultCategoriesConfigSection: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<string[]>([]);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    setCategories(getDefaultCategories());
  }, []);

  const handleSave = (updated: string[]) => {
    setCategories(updated);
    saveDefaultCategories(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert(t('settings.defaultCategories.alreadyExists', 'Ce compartiment existe déjà.'));
      return;
    }
    const updated = [...categories, trimmed];
    handleSave(updated);
    setNewCatName('');
  };

  const handleDelete = (name: string) => {
    if (categories.length <= 1) {
      alert(t('settings.defaultCategories.atLeastOne', 'Il doit y avoir au moins un compartiment par défaut.'));
      return;
    }
    const updated = categories.filter((c) => c !== name);
    handleSave(updated);
  };

  const handleReset = () => {
    handleSave(DEFAULT_CATEGORIES);
  };

  return (
    <div className="glass-card settings-card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FolderTree size={22} className="section-icon text-indigo" />
          <div>
            <h3>{t('settings.defaultCategories.title', 'Compartiments par Défaut (Bibliothèque)')}</h3>
            <p>{t('settings.defaultCategories.desc', 'Définissez les sous-dossiers automatiques créés pour chaque nouvelle ECUE (ex: CM, TD, Sujets...)')}</p>
          </div>
        </div>

        <button
          className="btn-secondary-sm"
          onClick={handleReset}
          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <RefreshCw size={12} />
          <span>{t('settings.defaultCategories.resetBtn', 'Réinitialiser')}</span>
        </button>
      </div>

      <div className="default-categories-chips" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '1rem', marginBottom: '1rem' }}>
        {categories.map((cat) => (
          <div key={cat} className="category-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', fontWeight: 600, fontSize: '0.825rem' }}>
            <span>📁 {cat}</span>
            <button
              onClick={() => handleDelete(cat)}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'inline-flex', padding: '0.1rem' }}
              title="Supprimer le compartiment"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={t('settings.defaultCategories.inputPlaceholder', 'Nom du compartiment (ex: Annales, Projets...)')}
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          className="label-input"
          style={{ flex: 1, maxWidth: '320px', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(0, 0, 0, 0.3)', color: 'var(--text-primary)', fontSize: '0.825rem' }}
          required
        />
        <button
          type="submit"
          className="btn-confirm-add"
          style={{ padding: '0.4rem 0.85rem', borderRadius: '6px', background: 'var(--gradient-primary)', color: '#ffffff', fontWeight: 600, fontSize: '0.825rem', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <Plus size={14} />
          <span>{t('settings.defaultCategories.addBtn', 'Ajouter')}</span>
        </button>
      </form>
    </div>
  );
};
