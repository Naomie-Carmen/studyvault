import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ECUE } from '../../types/structure';
import { Layers, X, Save } from 'lucide-react';

interface ECUEModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { ueId: string; title: string; code?: string; ects?: number; instructor?: string }) => Promise<void>;
  ueId: string;
  editECUE?: ECUE | null;
}

export const ECUEModal: React.FC<ECUEModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  ueId,
  editECUE,
}) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [ects, setEcts] = useState<string>('');
  const [instructor, setInstructor] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editECUE) {
      setTitle(editECUE.title);
      setCode(editECUE.code || '');
      setEcts(editECUE.ects !== undefined && editECUE.ects !== null ? String(editECUE.ects) : '');
      setInstructor(editECUE.instructor || '');
    } else {
      setTitle('');
      setCode('');
      setEcts('');
      setInstructor('');
    }
  }, [editECUE, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError(t('modal.ecueTitleReq', 'L\'intitulé de l\'ECUE est obligatoire.'));
      return;
    }

    const parsedEcts = ects.trim() ? parseFloat(ects) : undefined;
    if (parsedEcts !== undefined && (isNaN(parsedEcts) || parsedEcts <= 0)) {
      setError(t('modal.ecueEctsInvalid', 'Le coefficient ECTS doit être un nombre positif.'));
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        ueId,
        title: title.trim(),
        code: code.trim() || undefined,
        ects: parsedEcts,
        instructor: instructor.trim() || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('modal.ecueSaveErr', 'Erreur lors de l\'enregistrement de l\'ECUE.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card modal-card">
        <div className="modal-header">
          <div className="title-group">
            <Layers size={20} className="text-purple" />
            <h3>{editECUE ? t('modal.editECUE', 'Modifier l\'ECUE') : t('modal.newECUE', 'Nouvel ECUE (Élément Constitutif)')}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>{t('modal.ecueTitleLabel', 'Intitulé de l\'ECUE *')}</label>
            <input
              type="text"
              placeholder={t('modal.ecueTitlePlaceholder', 'ex: Microéconomie Approfondie')}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>{t('modal.ecueCodeLabel', 'Code ECUE (Optionnel)')}</label>
            <input
              type="text"
              placeholder={t('modal.ecueCodePlaceholder', 'ex: ECUE1')}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('modal.ecueInstructorLabel', 'Enseignant / Professeur (Optionnel)')}</label>
            <input
              type="text"
              placeholder={t('modal.ecueInstructorPlaceholder', 'ex: Pr. Martin')}
              value={instructor}
              onChange={(e) => setInstructor(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>{t('modal.ecueEctsLabel', 'Crédits ECTS / Coefficient (Optionnel)')}</label>
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="30"
              placeholder={t('modal.ecueEctsPlaceholder', 'ex: 3.0')}
              value={ects}
              onChange={(e) => setEcts(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              {t('common.cancel', 'Annuler')}
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              <Save size={16} />
              <span>{loading ? t('common.saving', 'Enregistrement...') : editECUE ? t('common.save', 'Enregistrer') : t('modal.createECUE', 'Créer l\'ECUE')}</span>
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

        .text-purple { color: var(--accent-purple); }
      `}</style>
    </div>
  );
};
