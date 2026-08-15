import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Subject } from '../../types/structure';
import { BookOpen, X, Save } from 'lucide-react';

interface SubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { ueId?: string; ecueId?: string; name: string; instructor?: string; color?: string }) => Promise<void>;
  ueId?: string;
  ecueId?: string;
  editSubject?: Subject | null;
}

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#a855f7', // Purple
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
];

export const SubjectModal: React.FC<SubjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ueId,
  ecueId,
  editSubject,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editSubject) {
      setName(editSubject.name);
      setInstructor(editSubject.instructor || '');
      setColor(editSubject.color || '#6366f1');
    } else {
      setName('');
      setInstructor('');
      setColor('#6366f1');
    }
  }, [editSubject, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t('modal.subNameReq', 'Le nom de la matière est obligatoire.'));
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ueId,
        ecueId,
        name: name.trim(),
        instructor: instructor.trim() || undefined,
        color,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('modal.subSaveErr', 'Erreur lors de l\'enregistrement de la matière.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card modal-card">
        <div className="modal-header">
          <div className="title-group">
            <BookOpen size={20} className="text-cyan" />
            <h3>{editSubject ? t('modal.editSubject', 'Modifier la Matière') : t('modal.newSubject', 'Nouvelle Matière d\'Enseignement')}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>{t('modal.subNameLabel', 'Nom de la Matière *')}</label>
            <input
              type="text"
              placeholder={t('modal.subNamePlaceholder', 'ex: Travaux Dirigés de Microéconomie')}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('modal.subInstructorLabel', 'Enseignant / Professeur (Optionnel)')}</label>
            <input
              type="text"
              placeholder={t('modal.subInstructorPlaceholder', 'ex: Pr. Martin')}
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('modal.subColorLabel', 'Couleur d\'Identification')}</label>
            <div className="color-picker-group">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-swatch ${color === c ? 'selected' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              {t('common.cancel', 'Annuler')}
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              <Save size={16} />
              <span>{loading ? t('common.saving', 'Enregistrement...') : editSubject ? t('common.save', 'Enregistrer') : t('modal.createSubject', 'Créer la Matière')}</span>
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          padding: 1rem;
        }

        .modal-card {
          width: 100%;
          max-width: 440px;
          padding: 1.75rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1.25rem;
        }

        .title-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .title-group h3 {
          font-size: 1.1rem;
        }

        .close-btn {
          color: var(--text-muted);
          padding: 0.25rem;
        }

        .modal-error {
          padding: 0.6rem 0.875rem;
          border-radius: var(--radius-md);
          background: var(--status-error-bg);
          color: var(--status-error);
          font-size: 0.8rem;
          margin-bottom: 1rem;
        }

        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .form-group input {
          width: 100%;
          padding: 0.65rem 0.875rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          outline: none;
        }

        .color-picker-group {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.25rem;
        }

        .color-swatch {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: transform var(--transition-fast);
        }

        .color-swatch:hover {
          transform: scale(1.15);
        }

        .color-swatch.selected {
          border-color: #ffffff;
          box-shadow: 0 0 10px currentColor;
        }

        .modal-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .btn-cancel {
          padding: 0.6rem 1rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-secondary);
          font-size: 0.85rem;
          font-weight: 600;
        }

        .btn-submit {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.6rem 1.15rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .text-cyan { color: var(--accent-cyan); }
      `}</style>
    </div>
  );
};
