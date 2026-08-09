import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as docService from '../../services/documentService';
import { DocumentItem } from '../../types/document';

interface FileUploadZoneProps {
  subjectId?: string;
  personalFolderId?: string;
  onUploadSuccess: (docs: DocumentItem[]) => void;
  defaultDocType?: 'cours' | 'TD' | 'TP' | 'examen' | 'autre';
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  subjectId,
  personalFolderId,
  onUploadSuccess,
  defaultDocType = 'cours',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [docType, setDocType] = useState<'cours' | 'TD' | 'TP' | 'examen' | 'autre'>(defaultDocType);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | File[]) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    // Validate size (50MB) and type
    for (const f of fileArray) {
      if (f.size > 50 * 1024 * 1024) {
        setErrorMsg(`Le fichier "${f.name}" dépasse la taille maximale autorisée de 50 Mo.`);
        return;
      }
    }

    const formData = new FormData();
    fileArray.forEach((f) => formData.append('files', f));
    if (subjectId) formData.append('subjectId', subjectId);
    if (personalFolderId) formData.append('personalFolderId', personalFolderId);
    formData.append('docType', docType);

    setUploading(true);
    setProgress(30);

    try {
      const timer = setInterval(() => {
        setProgress((prev) => (prev >= 90 ? prev : prev + 15));
      }, 150);

      const res = await docService.uploadFiles(formData);
      clearInterval(timer);
      setProgress(100);

      if (res.success && Array.isArray(res.data)) {
        setSuccessMsg(`${res.data.length} document(s) importé(s) avec succès !`);
        onUploadSuccess(res.data);
      } else {
        setErrorMsg(res.error?.message || 'Erreur lors de l\'upload du fichier.');
      }
    } catch (_err) {
      setErrorMsg('Impossible d\'importer les fichiers.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
      }, 600);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  return (
    <div className="file-upload-zone-container">
      {/* Category Picker Selector (if academic) */}
      {subjectId && (
        <div className="doc-type-selector">
          <label>Catégorie Pédagogique :</label>
          <div className="type-buttons">
            {(['cours', 'TD', 'TP', 'examen', 'autre'] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={`type-btn ${docType === t ? 'active' : ''}`}
                onClick={() => setDocType(t)}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${uploading ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className="hidden-input"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />

        <div className="drop-zone-content">
          <UploadCloud size={36} className="upload-icon text-indigo" />
          <p className="drop-title">
            Glissez-déposez vos fichiers ici, ou <span>parcourez</span>
          </p>
          <p className="drop-subtitle">
            Formats acceptés : PDF, Word (DOC, DOCX), JPG, PNG (Max 50 Mo)
          </p>
        </div>
      </div>

      {/* Upload Progress Bar */}
      {uploading && (
        <div className="upload-progress-card">
          <div className="progress-header">
            <File size={16} className="spinning text-indigo" />
            <span>Importation des fichiers en cours... ({progress}%)</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Alerts */}
      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      <style>{`
        .file-upload-zone-container {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .doc-type-selector {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .doc-type-selector label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .type-buttons {
          display: flex;
          gap: 0.35rem;
        }

        .type-btn {
          padding: 0.25rem 0.6rem;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-muted);
          font-size: 0.725rem;
          font-weight: 700;
        }

        .type-btn.active {
          background: var(--gradient-primary);
          color: #ffffff;
          border-color: transparent;
        }

        .drop-zone {
          border: 2px dashed var(--border-color);
          border-radius: var(--radius-lg);
          padding: 1.75rem 1.25rem;
          text-align: center;
          background: rgba(255, 255, 255, 0.015);
          cursor: pointer;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }

        .drop-zone:hover,
        .drop-zone.dragging {
          border-color: var(--primary);
          background: rgba(99, 102, 241, 0.06);
        }

        .drop-zone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.4rem;
        }

        .drop-title {
          font-size: 0.9rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .drop-title span {
          color: var(--primary);
          font-weight: 600;
          text-decoration: underline;
        }

        .drop-subtitle {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .hidden-input {
          display: none;
        }

        .upload-progress-card {
          padding: 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.25);
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .progress-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.8rem;
          color: var(--text-primary);
          font-weight: 600;
        }

        .progress-bar-bg {
          height: 6px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--gradient-primary);
          transition: width 0.2s ease;
        }

        .alert {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.875rem;
          border-radius: var(--radius-md);
          font-size: 0.825rem;
        }

        .alert-success {
          background: var(--status-success-bg);
          color: var(--status-success);
        }

        .alert-error {
          background: var(--status-error-bg);
          color: var(--status-error);
        }

        .text-indigo { color: var(--primary); }
      `}</style>
    </div>
  );
};
