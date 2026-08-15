import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as timetableService from '../../services/timetableService';
import * as ocrService from '../../services/ocrService';
import { processMultiOrientationOCR } from '../../utils/ocrImage';
import { API_BASE_URL } from '../../services/apiClient';
import { ImportProgress } from './ImportProgress';
import { TimetableValidationModal } from './TimetableValidationModal';
import { X, UploadCloud, FileCheck, AlertCircle, Cpu, RefreshCw, Sparkles } from 'lucide-react';

import { extractTableWithDetails, WordItem } from '../../utils/ocrTable';

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
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [ocrStatus, setOcrStatus] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number>(0);

  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiFailed, setAiFailed] = useState<boolean>(false);

  const modalCardRef = useRef<HTMLDivElement>(null);
  const actionBlockRef = useRef<HTMLDivElement>(null);

  const isImage = file ? (file.type.startsWith('image/') || /\.(png|jpe?g)$/i.test(file.name)) : false;

  useEffect(() => {
    if (isOpen) {
      if (modalCardRef.current) {
        modalCardRef.current.scrollTop = 0;
        modalCardRef.current.focus();
      }
      setFile(null);
      setImportedId(null);
      setIsProcessing(false);
      setIsValidating(false);
      setUploading(false);
      setErrorMsg(null);
      setOcrStatus(null);
      setOcrProgress(0);
      setAiLoading(false);
      setAiError(null);
      setAiFailed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isImage && file) {
      const timer = setTimeout(() => {
        actionBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isImage, file]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setAiError(null);
      setAiFailed(false);
      setErrorMsg(null);
    }
  };

  const handleRunAiExtraction = async () => {
    if (!file) return;
    setAiLoading(true);
    setAiError(null);
    setErrorMsg(null);

    try {
      setOcrStatus(t('timetableImport.stepOcr', '1/2 Lecture locale de la photo…'));
      const details = await extractTableWithDetails(file);
      const rawOcrText = (details.words || []).map((w: WordItem) => w.text).join(' ').slice(0, 6000);

      setOcrStatus(t('timetableImport.stepAi', '2/2 Reconstruction par IA…'));
      const token = localStorage.getItem('studyvault_access_token') || '';
      const response = await fetch(`${API_BASE_URL}/ai/structure`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ rawText: rawOcrText }),
      });

      if (!response.ok) {
        throw new Error(t('timetableImport.aiErrStatus', 'Échec du service IA (status {{status}}).', { status: response.status }));
      }

      const json = await response.json();
      if (!json.success || !json.data?.rows) {
        throw new Error(json.error?.message || t('timetableImport.aiErrFormat', 'Données IA non exploitables.'));
      }

      const csvContent = json.data.rows.map((row: string[]) => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
      const csvBlob = new Blob([csvContent], { type: 'text/csv' });
      const csvFile = new File([csvBlob], 'timetable_ai.csv', { type: 'text/csv' });

      setOcrStatus(t('timetableImport.uploadingStatus', 'Téléversement et analyse du planning...'));
      const uploadRes = await timetableService.uploadTimetableFile(csvFile);
      if (uploadRes.success && uploadRes.data) {
        setImportedId(uploadRes.data.id);
        await ocrService.processImport(uploadRes.data.id);
        setAiLoading(false);
        setOcrStatus(null);
        setIsProcessing(true);
      } else {
        throw new Error(uploadRes.error?.message || t('timetableImport.uploadErr', 'Erreur lors du téléversement du CSV IA.'));
      }
    } catch (err: any) {
      console.warn('[Extraction IA Planning Error]', err);
      setAiError(err.message || t('timetableImport.aiErrorDefault', 'Extraction IA indisponible pour cette image. Veuillez utiliser l\'extraction locale.'));
      setAiFailed(true);
      setAiLoading(false);
      setOcrStatus(null);
    }
  };

  const handleUploadAndRunOCR = async () => {
    if (!file) return;
    setUploading(true);
    setErrorMsg(null);
    setOcrStatus(t('timetableImport.preparingFile', 'Préparation du fichier...'));
    setOcrProgress(10);

    try {
      let fileToUpload: File = file;

      if (isImage) {
        setOcrStatus(t('timetableImport.ocrReading', 'Lecture OCR et détection d\'orientation...'));
        setOcrProgress(30);
        const extractedText = await processMultiOrientationOCR(file, (msg, pct) => {
          setOcrStatus(msg);
          setOcrProgress(30 + Math.round(pct * 0.5));
        });

        if (!extractedText.trim()) {
            throw new Error(t('timetableImport.ocrNoText', 'Aucun texte n\'a pu être extrait de l\'image. Veuillez vérifier la qualité de la photo.'));
        }

        const textFileName = file.name.replace(/\.[^/.]+$/, '') + '.txt';
        fileToUpload = new File([extractedText], textFileName, { type: 'text/plain' });
      }

      setOcrStatus(t('timetableImport.uploadingStatus', 'Téléversement et analyse du planning...'));
      const res = await timetableService.uploadTimetableFile(fileToUpload);
      if (res.success && res.data) {
        setImportedId(res.data.id);
        await ocrService.processImport(res.data.id);
        setUploading(false);
        setOcrStatus(null);
        setIsProcessing(true);
      } else {
        setErrorMsg(res.error?.message || t('timetableImport.uploadErrDefault', 'Erreur lors du téléversement.'));
        setUploading(false);
        setOcrStatus(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || t('timetableImport.processErr', 'Échec du traitement du fichier.'));
      setUploading(false);
      setOcrStatus(null);
    }
  };

  const handleProgressComplete = () => {
    setIsProcessing(false);
    setIsValidating(true);
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="glass-card import-modal-card" ref={modalCardRef} tabIndex={-1}>
          <div className="modal-header">
            <h3>{t('timetableImport.title', 'Importer un Emploi du Temps Officiel')}</h3>
            <button className="btn-close" onClick={onClose} disabled={uploading || aiLoading}>
              <X size={18} />
            </button>
          </div>

          <div className="modal-body">
            {isProcessing ? (
              <ImportProgress onComplete={handleProgressComplete} />
            ) : (
              <>
                <p className="import-info">
                  {t('timetableImport.info', 'Téléversez une photo ou un document PDF de votre emploi du temps pour déclencher l\'extraction automatique par IA ou OCR.')}
                </p>

                {errorMsg && (
                  <div className="alert alert-error">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {ocrStatus && (
                  <div className="alert alert-info">
                    <RefreshCw size={16} className="spinning text-indigo" />
                    <span>{ocrStatus} ({ocrProgress}%)</span>
                  </div>
                )}

                <div className="dropzone-container">
                  <input
                    type="file"
                    id="timetable-file-input"
                    accept="application/pdf,image/png,image/jpeg"
                    onChange={handleFileChange}
                    disabled={uploading || aiLoading}
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
                        <span className="drop-title">{t('timetableImport.dropTitle', 'Cliquez pour choisir une photo ou un PDF')}</span>
                        <span className="drop-sub">{t('timetableImport.dropSub', 'Formats autorisés : PDF, PNG, JPG (max 20 Mo)')}</span>
                      </>
                    )}
                  </label>
                </div>

                {isImage && (
                  <div
                    className="extraction-mode-block"
                    ref={actionBlockRef}
                    style={{
                      marginTop: '1rem',
                      padding: '1rem',
                      background: 'rgba(15, 23, 42, 0.6)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileCheck size={18} className="text-cyan" />
                      <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{file?.name || ''}</span>
                    </div>

                    {aiError && (
                      <div className="alert alert-error" style={{ fontSize: '0.825rem', padding: '0.65rem 0.85rem' }}>
                        <AlertCircle size={16} />
                        <span>{aiError}</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleRunAiExtraction}
                        disabled={aiLoading || uploading}
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          padding: '0.75rem 1rem',
                          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          cursor: aiLoading || uploading ? 'not-allowed' : 'pointer',
                          boxShadow: '0 4px 14px rgba(99, 102, 241, 0.35)',
                        }}
                      >
                        {aiLoading ? (
                          <>
                            <RefreshCw size={18} className="spinning" />
                            <span>{t('timetableImport.aiAnalyzing', 'Analyse IA en cours…')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            <span>{t('timetableImport.aiExtractBtn', '✨ Extraction IA (recommandé)')}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleUploadAndRunOCR}
                        disabled={aiLoading || uploading}
                        style={{
                          flex: 1,
                          minWidth: '200px',
                          padding: '0.75rem 1rem',
                          background: aiFailed ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                          border: aiFailed ? '1px solid #818cf8' : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: '#fff',
                          fontWeight: 600,
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          cursor: aiLoading || uploading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {uploading ? (
                          <>
                            <RefreshCw size={18} className="spinning text-indigo" />
                            <span>{t('timetableImport.localOcrRunning', 'OCR local ({{progress}}%)…', { progress: ocrProgress })}</span>
                          </>
                        ) : (
                          <>
                            <Cpu size={18} className="text-indigo" />
                            <span>{t('timetableImport.localExtractBtn', 'Extraction locale (sans internet)')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {!isProcessing && !isImage && (
            <div className="modal-footer">
              <button className="btn-cancel" onClick={onClose}>
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                className="btn-submit"
                onClick={handleUploadAndRunOCR}
                disabled={!file || uploading || aiLoading}
              >
                <Cpu size={16} />
                <span>{uploading ? t('timetableImport.uploading', 'Téléversement...') : t('timetableImport.startExtractBtn', 'Lancer l\'Extraction')}</span>
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
            width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;
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
