import React, { useState, useEffect } from 'react';
import * as rgpdService from '../../services/rgpdService';
import { useAuth } from '../../context/useAuth';
import { ShieldCheck, Download, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

export const PrivacySettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [contentAnalysisOptIn, setContentAnalysisOptIn] = useState(false);
  const [loadingConsent, setLoadingConsent] = useState(true);
  const [savingConsent, setSavingConsent] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [downloading, setDownloading] = useState(false);

  // Account deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    rgpdService.getUserConsent().then((res) => {
      if (mounted && res.success && res.data) {
        setAnalyticsOptIn(res.data.analyticsOptIn);
        setContentAnalysisOptIn(res.data.contentAnalysisOptIn);
      }
      if (mounted) setLoadingConsent(false);
    }).catch(() => {
      if (mounted) setLoadingConsent(false);
    });
    return () => { mounted = false; };
  }, []);

  const handleSaveConsent = async () => {
    setSavingConsent(true);
    setSuccessMsg(null);
    try {
      const res = await rgpdService.updateUserConsent(analyticsOptIn, contentAnalysisOptIn);
      if (res.success) {
        setSuccessMsg('Vos préférences de confidentialité ont été enregistrées.');
      }
    } catch (_e) {
      /* ignore */
    } finally {
      setSavingConsent(false);
    }
  };

  const handleDownloadExport = async () => {
    setDownloading(true);
    try {
      await rgpdService.downloadDataExport();
    } catch (_e) {
      alert('Erreur lors du téléchargement de l\'export RGPD.');
    } finally {
      setDownloading(false);
    }
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmText !== 'SUPPRIMER') return;
    setDeleting(true);
    try {
      const res = await rgpdService.deleteAccount();
      if (res.success) {
        alert(res.data?.message || 'Compte programmé pour suppression.');
        logout();
      }
    } catch (_e) {
      alert('Erreur lors de la demande de suppression.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="privacy-settings-page">
      <div className="page-header">
        <ShieldCheck size={28} className="text-indigo" />
        <div>
          <h2>Paramètres de Confidentialité &amp; Droits RGPD</h2>
          <p className="page-subtitle">
            Gérez vos consentements, téléchargez l'intégralité de vos données personnelles ou supprimez votre compte.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success">
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 1. Consent Preferences */}
      <div className="glass-card settings-section">
        <h3>1. Gestion des Consentements</h3>

        <div className="consent-toggle-list">
          {loadingConsent ? (
            <p className="consent-loading">Chargement de vos préférences de consentement…</p>
          ) : (
            <>
          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-title">Mesure d'audience &amp; Amélioration anonyme (Opt-In)</span>
              <p className="toggle-desc">
                Autoriser des métriques anonymisées pour nous aider à améliorer l'ergonomie de l'application. Pas de cookies publicitaires.
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={analyticsOptIn}
                onChange={(e) => setAnalyticsOptIn(e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>

          <div className="toggle-row">
            <div className="toggle-info">
              <span className="toggle-title">Analyse OCR &amp; Classement de Contenu (Opt-In)</span>
              <p className="toggle-desc">
                Autoriser l'analyse de contenu de vos documents pour générer des suggestions de classement plus précises.
              </p>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={contentAnalysisOptIn}
                onChange={(e) => setContentAnalysisOptIn(e.target.checked)}
              />
              <span className="slider round" />
            </label>
          </div>
            </>
          )}
        </div>

        <button className="btn-save-consent" onClick={handleSaveConsent} disabled={savingConsent || loadingConsent}>
          {savingConsent ? 'Enregistrement...' : 'Enregistrer mes préférences'}
        </button>
      </div>

      {/* 2. Data Portability */}
      <div className="glass-card settings-section">
        <h3>2. Portabilité des Données (Article 20 RGPD)</h3>
        <p className="section-desc">
          Téléchargez une copie intégrale au format JSON de toutes vos données (profil, semestres, cours, emploi du temps, métadonnées).
        </p>

        <button className="btn-export-data" onClick={handleDownloadExport} disabled={downloading}>
          <Download size={16} />
          <span>{downloading ? 'Génération de l\'export...' : 'Télécharger mon Archive Complète (JSON)'}</span>
        </button>
      </div>

      {/* 3. Account Deletion */}
      <div className="glass-card settings-section danger-zone">
        <h3 className="danger-title">3. Suppression Définitive du Compte (Droit à l'Oubli)</h3>
        <p className="section-desc">
          La suppression de votre compte entraînera une désactivation immédiate et la purge irréversible de l'ensemble de vos cours, emplois du temps et documents sous 30 jours.
        </p>

        <button className="btn-delete-account" onClick={() => setShowDeleteModal(true)}>
          <Trash2 size={16} />
          <span>Demander la suppression de mon compte</span>
        </button>
      </div>

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="glass-card delete-modal-card">
            <div className="modal-header">
              <AlertTriangle size={24} className="text-red" />
              <h3>Confirmation de Suppression de Compte</h3>
            </div>

            <p className="modal-text">
              Êtes-vous absolument sûr ? Votre compte sera désactivé immédiatement et <strong>toutes vos données seront supprimées définitivement dans 30 jours</strong>.
            </p>

            <div className="confirm-input-box">
              <label>Saisissez <strong>SUPPRIMER</strong> pour confirmer :</label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
              />
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button
                className="btn-confirm-delete"
                onClick={handleConfirmDeleteAccount}
                disabled={deleteConfirmText !== 'SUPPRIMER' || deleting}
              >
                {deleting ? 'Suppression...' : 'Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .privacy-settings-page { display: flex; flex-direction: column; gap: 1.5rem; max-width: 800px; margin: 0 auto; }
        .page-header { display: flex; align-items: center; gap: 0.85rem; }
        .page-header h2 { font-size: 1.35rem; font-weight: 800; }
        .page-subtitle { font-size: 0.85rem; color: var(--text-muted); }

        .settings-section { padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
        .settings-section h3 { font-size: 1.05rem; font-weight: 700; border-bottom: 1px solid var(--border-color); pb: 0.5rem; }

        .consent-toggle-list { display: flex; flex-direction: column; gap: 1rem; }
        .consent-loading { font-size: 0.85rem; color: var(--text-muted); }
        .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .toggle-title { font-size: 0.9rem; font-weight: 700; color: var(--text-primary); }
        .toggle-desc { font-size: 0.8rem; color: var(--text-muted); margin-top: 0.15rem; }

        .btn-save-consent { width: fit-content; padding: 0.6rem 1.15rem; border-radius: var(--radius-md); background: var(--gradient-primary); color: #ffffff; font-weight: 700; font-size: 0.85rem; }
        .btn-export-data { width: fit-content; display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.15rem; border-radius: var(--radius-md); background: rgba(99, 102, 241, 0.15); color: var(--primary); font-weight: 700; border: 1px solid rgba(99, 102, 241, 0.3); font-size: 0.85rem; }

        .danger-zone { border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.03); }
        .danger-title { color: var(--status-error); }
        .btn-delete-account { width: fit-content; display: flex; align-items: center; gap: 0.4rem; padding: 0.6rem 1.15rem; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.15); color: var(--status-error); font-weight: 700; border: 1px solid rgba(239, 68, 68, 0.3); font-size: 0.85rem; }

        /* Switch UI */
        .switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; inset: 0; background-color: rgba(255,255,255,0.1); transition: .4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
        input:checked + .slider { background-color: var(--primary); }
        input:checked + .slider:before { transform: translateX(20px); }

        .modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.8); display: flex; align-items: center; justify-content: center; z-index: 150; padding: 1rem; }
        .delete-modal-card { width: 100%; max-width: 480px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem; border-color: rgba(239, 68, 68, 0.4); }
        .modal-header { display: flex; align-items: center; gap: 0.5rem; }
        .modal-header h3 { font-size: 1.1rem; font-weight: 700; color: var(--status-error); }
        .modal-text { font-size: 0.85rem; color: var(--text-secondary); }
        .confirm-input-box { display: flex; flex-direction: column; gap: 0.35rem; font-size: 0.8rem; }
        .confirm-input-box input { padding: 0.55rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color); border-radius: var(--radius-md); color: var(--text-primary); font-weight: 700; }

        .modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 0.75rem; }
        .btn-cancel { padding: 0.5rem 0.85rem; border-radius: var(--radius-md); background: rgba(255,255,255,0.05); color: var(--text-secondary); font-size: 0.825rem; }
        .btn-confirm-delete { padding: 0.5rem 1rem; border-radius: var(--radius-md); background: var(--status-error); color: white; font-weight: 700; font-size: 0.825rem; }

        .alert-success { display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 0.85rem; border-radius: var(--radius-md); background: var(--status-success-bg); color: var(--status-success); font-size: 0.85rem; }
        .text-indigo { color: var(--primary); }
        .text-red { color: var(--status-error); }
      `}</style>
    </div>
  );
};
