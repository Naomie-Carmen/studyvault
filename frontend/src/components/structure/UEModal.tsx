import React, { useState, useEffect } from 'react';
import { UE } from '../../types/structure';
import { FolderTree, X, Save } from 'lucide-react';

interface UEModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { semesterId: string; title: string; code?: string; ects?: number }) => Promise<void>;
  semesterId: string;
  editUE?: UE | null;
}

export const UEModal: React.FC<UEModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  semesterId,
  editUE,
}) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [ects, setEcts] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editUE) {
      setTitle(editUE.title);
      setCode(editUE.code || '');
      setEcts(editUE.ects ? String(editUE.ects) : '');
    } else {
      setTitle('');
      setCode('');
      setEcts('');
    }
  }, [editUE, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('L\'intitulé de l\'UE est obligatoire.');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        semesterId,
        title: title.trim(),
        code: code.trim() || undefined,
        ects: ects ? parseFloat(ects) : undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'enregistrement de l\'UE.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="glass-card modal-card">
        <div className="modal-header">
          <div className="title-group">
            <FolderTree size={20} className="text-indigo" />
            <h3>{editUE ? 'Modifier l\'Unité d\'Enseignement' : 'Nouvelle Unité d\'Enseignement (UE)'}</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && <div className="modal-error">{error}</div>}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Intitulé de l'UE *</label>
            <input
              type="text"
              placeholder="ex: Économie et Mathématiques de Gestion"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Code UE (Optionnel)</label>
              <input
                type="text"
                placeholder="ex: UE1.1"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Crédits ECTS (Optionnel)</label>
              <input
                type="number"
                step="0.5"
                placeholder="ex: 6.0"
                value={ects}
                onChange={(e) => setEcts(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={loading}>
              Annuler
            </button>
            <button type="submit" className="btn-submit" disabled={loading}>
              <Save size={16} />
              <span>{loading ? 'Enregistrement...' : editUE ? 'Enregistrer' : 'Créer l\'UE'}</span>
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
          max-width: 480px;
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

        .close-btn:hover {
          color: var(--text-primary);
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

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
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

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
