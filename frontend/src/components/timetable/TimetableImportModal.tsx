import React, { useState } from 'react';
import * as timetableService from '../../services/timetableService';
import * as ocrService from '../../services/ocrService';
import { ImportProgress } from './ImportProgress';
import { TimetableValidationModal } from './TimetableValidationModal';
import { X, UploadCloud, FileCheck, AlertCircle, Cpu } from 'lucide-react';

interface TimetableImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const TimetableImportModal: React.FC<TimetableImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadAndRunOCR = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);

    try {
      const res = await timetableService.uploadTimetableFile(file);
      if (res.success && res.data) {
        setImportedId(res.data.id);
        // Trigger OCR process
        await ocrService.processImport(res.data.id);
        setUploading(false);
        setIsProcessing(true);
      } else {
        setErrorMsg(res.error?.message || 'Erreur lors du téléversement.');
        setUploading(false);
      }
    } catch (_err) {
      setErrorMsg('Échec du traitement du fichier.');
      setUploading(false);
    }
  };

  const handleProgressComplete = () => {
    setIsProcessing(false);
    setIsValidating(true);
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="glass-card import-modal-card">
          <div className="modal-header">
            <h3>Importer un Emploi du Temps Officiel</h3>
            <button className="btn-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            {isProcessing ? (
              <ImportProgress onComplete={handleProgressComplete} />
            ) : (
              <>
                <p className="import-info">
                  Téléversez une photo ou un document PDF de votre emploi du temps pour déclencher l'<strong>extraction automatique par OCR</strong>.
                </p>

                {errorMsg && (
                  <div className="alert alert-error">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="dropzone-container">
                  <input
                    type="file"
                    id="timetable-file-input"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={handleFileChange}
                    className="file-input-hidden"
                  />

                  <label htmlFor="timetable-file-input" className="dropzone-label">
                    <UploadCloud size={36} className="text-indigo" />
                    {file ? (
                      <div className="file-selected-box">
                        <FileCheck size={18} className="text-cyan" />
                        <span>{file.name} ({(file.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ) : (
                      <>
                        <span className="drop-title">Cliquez pour choisir une photo ou un PDF</span>
                        <span className="drop-sub">Formats autorisés : PDF, PNG, JPG (max 20 Mo)</span>
                      </>
                    )}
                  </label>
                </div>
              </>
            )}
          </div>

          {!isProcessing && (
            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>
                Annuler
              </button>
              <button
                className="btn-submit"
                onClick={handleUploadAndRunOCR}
                disabled={!file || uploading}
              >
                <Cpu size={16} />
                <span>{uploading ? 'Téléversement...' : 'Lancer l\'Extraction OCR'}</span>
              </button>
            </div>
          )}
        </div>

        <style>{`
          .modal-backdrop {
            position: fixed; inset: 0; background: rgba(0, 0, 0, 0.75);
            display: flex; align-items: center; justify-content: center; z-index: 110; padding: 1rem;
          }

          .import-modal-card {
            width: 100%; max-width: 500px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
          }

          .modal-header { display: flex; align-items: center; justify-content: space-between; }
          .modal-header h3 { font-size: 1.1rem; font-weight: 700; }

          .import-info { font-size: 0.85rem; color: var(--text-muted); }
          .file-input-hidden { display: none; }

          .dropzone-label {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            gap: 0.5rem; padding: 2rem; border: 2px dashed var(--border-color); border-radius: var(--radius-md);
            background: rgba(0, 0, 0, 0.2); cursor: pointer; text-align: center;
          }

          .dropzone-label:hover { border-color: var(--primary); background: rgba(99, 102, 241, 0.05); }

          .drop-title { font-size: 0.875rem; font-weight: 600; color: var(--text-primary); }
          .drop-sub { font-size: 0.75rem; color: var(--text-muted); }

          .file-selected-box { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }

          .modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; }
          .btn-cancel { padding: 0.5rem 0.85rem; border-radius: var(--radius-md); background: rgba(255, 255, 255, 0.05); color: var(--text-secondary); font-size: 0.825rem; }
          .btn-submit { display: flex; align-items: center; gap: 0.35rem; padding: 0.5rem 1.15rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-size: 0.825rem; font-weight: 600; }

          .alert-error { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem; border-radius: var(--radius-md); background: var(--status-error-bg); color: var(--status-error); font-size: 0.8rem; }
          .text-indigo { color: var(--primary); }
          .text-cyan { color: var(--accent-cyan); }
        `}</style>
      </div>

      {/* Mandatory Validation Modal */}
      {importedId && (
        <TimetableValidationModal
          isOpen={isValidating}
          importId={importedId}
          onClose={() => setIsValidating(false)}
          onSuccessValidate={() => {
            setIsValidating(false);
            onSuccess();
            onClose();
          }}
        />
      )}
    </>
  );
};
