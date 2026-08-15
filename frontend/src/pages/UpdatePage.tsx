import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  RefreshCw, 
  CheckCircle2, 
  Download, 
  Sparkles, 
  Laptop, 
  AlertCircle, 
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

const isTauri = typeof window !== 'undefined' && Boolean(
  (window as any).__TAURI__ ||
  (window as any).__TAURI_IPC__ ||
  (window as any).__TAURI_METADATA__ ||
  window.location.protocol.startsWith('tauri') ||
  window.location.protocol.startsWith('asset')
);

interface UpdateManifest {
  version?: string;
  body?: string;
  date?: string;
}

export const UpdatePage: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'checking' | 'up-to-date' | 'available' | 'downloading' | 'installed' | 'error'>('checking');
  const [currentVersion, setCurrentVersion] = useState<string>('1.0.3');
  const [updateManifest, setUpdateManifest] = useState<UpdateManifest | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkForUpdates = async () => {
    if (!isTauri) {
      return;
    }

    setStatus('checking');
    setErrorMessage(null);

    try {
      // Import Tauri API dynamically
      const { checkUpdate } = await import('@tauri-apps/api/updater');
      const { getVersion } = await import('@tauri-apps/api/app');

      try {
        const ver = await getVersion();
        if (ver) setCurrentVersion(ver);
      } catch (_e) {
        // Fallback version
      }

      const updateResult = await checkUpdate();

      if (updateResult.shouldUpdate) {
        setUpdateManifest({
          version: updateResult.manifest?.version,
          body: updateResult.manifest?.body,
          date: updateResult.manifest?.date,
        });
        setStatus('available');
      } else {
        setStatus('up-to-date');
      }
    } catch (error) {
      console.error('Erreur vérification MAJ:', error);
      setErrorMessage(error instanceof Error ? error.message : t('update.errorContactServer', 'Impossible de contacter le serveur de mises à jour.'));
      setStatus('error');
    }
  };

  useEffect(() => {
    if (isTauri) {
      checkForUpdates();
    }
  }, []);

  const handleInstallUpdate = async () => {
    if (!isTauri) return;

    setStatus('downloading');
    setErrorMessage(null);

    try {
      const { installUpdate } = await import('@tauri-apps/api/updater');
      await installUpdate();
      setStatus('installed');
    } catch (error) {
      console.error('Erreur installation MAJ:', error);
      setErrorMessage(error instanceof Error ? error.message : t('update.errorDownloadInstall', 'Échec du téléchargement ou de l\'installation.'));
      setStatus('error');
    }
  };

  const handleRelaunch = async () => {
    if (!isTauri) return;
    try {
      const { relaunch } = await import('@tauri-apps/api/process');
      await relaunch();
    } catch (error) {
      console.error('Erreur relance application:', error);
    }
  };

  // Web view
  if (!isTauri) {
    return (
      <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
        <div className="page-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div className="page-header-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0, boxShadow: '0 4px 14px rgba(108, 99, 255, 0.35)' }}>
            <RefreshCw size={24} />
          </div>
          <div className="header-title-box" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
              {t('update.centerTitle', 'Centre de Mises à Jour')}
            </h1>
            <p className="subtitle" style={{ fontSize: '14px', color: 'var(--text-muted, #94a3b8)', margin: 0, lineHeight: 1.4 }}>
              {t('update.webSubtitle', 'Gestion des versions de l\'application StudyVault')}
            </p>
          </div>
        </div>

        <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px', background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '16px', margin: '16px 0', backdropFilter: 'blur(12px)' }}>
          <div className="empty-icon-circle" style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(108, 99, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8B5CF6', marginBottom: '16px', flexShrink: 0 }}>
            <Laptop size={32} />
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary, #ffffff)', margin: '0 0 8px 0', textAlign: 'center' }}>
            {t('update.webNoticeTitle', 'Application Web')}
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted, #94a3b8)', margin: '0 0 8px 0', textAlign: 'center', maxWidth: '450px', lineHeight: 1.5 }}>
            {t('update.webNoticeText', 'Les mises à jour automatiques sont disponibles dans l\'application desktop StudyVault.')}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted, #94a3b8)', margin: 0, textAlign: 'center', maxWidth: '450px' }}>
            {t('update.webNoticeSub', 'Sur le Web, vous profitez toujours automatiquement de la version serveur la plus récente.')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 24px' }}>
      <div className="page-header" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
        <div className="page-header-icon" style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #6C63FF 0%, #8B5CF6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0, boxShadow: '0 4px 14px rgba(108, 99, 255, 0.35)' }}>
          <RefreshCw size={24} />
        </div>
        <div className="header-title-box" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary, #ffffff)', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.25 }}>
            {t('update.centerTitle', 'Centre de Mises à Jour')}
          </h1>
          <p className="subtitle" style={{ fontSize: '14px', color: 'var(--text-muted, #94a3b8)', margin: 0, lineHeight: 1.4 }}>
            {t('update.subtitle', 'Gestion et installation des versions de StudyVault Desktop')}
          </p>
        </div>
      </div>

      <div className="update-content">
        {/* Status: Checking */}
        {status === 'checking' && (
          <div className="glass-card status-card checking-card">
            <RefreshCw size={40} className="spin-icon" />
            <h3>{t('update.checkingTitle', 'Recherche de mises à jour…')}</h3>
            <p>{t('update.checkingText', 'Vérification des nouvelles versions disponibles auprès des serveurs StudyVault.')}</p>
          </div>
        )}

        {/* Status: Up to date */}
        {status === 'up-to-date' && (
          <div className="glass-card status-card uptodate-card">
            <CheckCircle2 size={56} className="success-icon" />
            <h3>{t('update.uptodateTitle', 'Vous êtes à jour !')}</h3>
            <p className="version-badge">{t('update.currentVersion', 'Version actuelle : v{{version}}', { version: currentVersion })}</p>
            <p className="uptodate-desc">
              {t('update.uptodateDesc', 'Aucune nouvelle mise à jour n\'est disponible. Votre application bénéficie de toutes les dernières fonctionnalités et correctifs de sécurité.')}
            </p>
            <button className="btn-secondary" onClick={checkForUpdates}>
              <RefreshCw size={16} />
              {t('update.checkAgain', 'Rechercher à nouveau')}
            </button>
          </div>
        )}

        {/* Status: Available */}
        {status === 'available' && updateManifest && (
          <div className="glass-card update-available-card">
            <div className="card-badge">
              <Sparkles size={16} />
              <span>{t('update.availableTitle', 'Nouvelle version disponible')}</span>
            </div>

            <div className="update-header">
              <div>
                <h2>StudyVault v{updateManifest.version || '1.0.0'}</h2>
                <p className="update-current">{t('update.installedVersion', 'Version actuelle installée : v{{version}}', { version: currentVersion })}</p>
                {updateManifest.date && (
                  <p className="update-date">{t('update.publishedDate', 'Publiée le {{date}}', { date: new Date(updateManifest.date).toLocaleDateString() })}</p>
                )}
              </div>
            </div>

            {updateManifest.body && (
              <div className="changelog-box">
                <h4>{t('update.releaseNotes', 'Notes de version :')}</h4>
                <div className="changelog-text">
                  {updateManifest.body.split('\n').map((line, idx) => (
                    <p key={idx}>{line}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="action-row">
              <button className="btn-primary-glow" onClick={handleInstallUpdate}>
                <Download size={20} />
                {t('update.updateNow', 'Mettre à jour maintenant')}
              </button>
              <button className="btn-secondary" onClick={checkForUpdates}>
                <RefreshCw size={16} />
                {t('update.recheck', 'Revérifier')}
              </button>
            </div>
          </div>
        )}

        {/* Status: Downloading / Installing */}
        {status === 'downloading' && (
          <div className="glass-card status-card downloading-card">
            <Download size={48} className="pulse-icon" />
            <h3>{t('update.downloadingTitle', 'Téléchargement et installation…')}</h3>
            <p>{t('update.downloadingText', 'Veuillez patienter pendant le téléchargement et la préparation de la mise à jour.')}</p>
            <div className="progress-bar-container">
              <div className="progress-bar-indeterminate" />
            </div>
          </div>
        )}

        {/* Status: Installed */}
        {status === 'installed' && (
          <div className="glass-card status-card installed-card">
            <CheckCircle2 size={56} className="success-icon" />
            <h3>{t('update.installedSuccessTitle', 'Mise à jour installée avec succès !')}</h3>
            <p>
              {t('update.installedSuccessText', 'La nouvelle version de StudyVault a été préparée. Redémarrez l\'application pour appliquer la mise à jour.')}
            </p>
            <button className="btn-primary-glow" onClick={handleRelaunch}>
              <RotateCcw size={20} />
              {t('update.relaunchApp', 'Redémarrer l\'application')}
            </button>
          </div>
        )}

        {/* Status: Error */}
        {status === 'error' && (
          <div className="glass-card status-card error-card">
            <AlertCircle size={48} className="error-icon" />
            <h3>{t('update.errorTitle', 'Erreur lors de la mise à jour')}</h3>
            <p>{errorMessage || t('update.errorDefault', 'Une erreur est survenue pendant la recherche ou l\'installation de la mise à jour.')}</p>
            <button className="btn-primary" onClick={checkForUpdates}>
              <RefreshCw size={16} />
              {t('update.retry', 'Réessayer')}
            </button>
          </div>
        )}

        {/* Security & Information Footer */}
        <div className="glass-card info-footer-card">
          <ShieldCheck size={24} className="info-icon" />
          <div>
            <h4>{t('update.securityTitle', 'Sécurité et Mises à jour')}</h4>
            <p>
              {t('update.securityText', 'Toutes les mises à jour de StudyVault sont vérifiées par signature cryptographique (Minisign) avant d\'être appliquées sur votre ordinateur.')}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .page-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
        }
        .page-header {
          margin-bottom: 2rem;
        }
        .header-title {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .header-icon {
          color: #6366f1;
        }
        .header-title h1 {
          font-size: 1.8rem;
          margin: 0;
          font-weight: 700;
        }
        .subtitle {
          color: var(--text-muted, #94a3b8);
          margin-top: 0.25rem;
          font-size: 0.95rem;
        }
        .update-content {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .status-card {
          padding: 3rem 2rem;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          border-radius: 16px;
          background: var(--bg-card, rgba(30, 41, 59, 0.7));
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .spin-icon {
          color: #6366f1;
          animation: spin 1.5s linear infinite;
        }
        .pulse-icon {
          color: #6366f1;
          animation: pulse 1.5s ease-in-out infinite;
        }
        .success-icon {
          color: #10b981;
        }
        .error-icon {
          color: #ef4444;
        }
        .version-badge {
          display: inline-block;
          background: rgba(99, 102, 241, 0.15);
          color: #818cf8;
          padding: 0.3rem 0.8rem;
          border-radius: 20px;
          font-weight: 600;
          font-size: 0.9rem;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        .uptodate-desc {
          color: var(--text-muted, #94a3b8);
          max-width: 500px;
          line-height: 1.6;
          margin: 0;
        }
        .update-available-card {
          padding: 2rem;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.95) 100%);
          border: 1px solid rgba(99, 102, 241, 0.3);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .card-badge {
          align-self: flex-start;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
          color: white;
          padding: 0.4rem 0.9rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .update-header h2 {
          font-size: 1.6rem;
          margin: 0 0 0.5rem 0;
        }
        .update-current {
          color: var(--text-muted, #94a3b8);
          margin: 0;
          font-size: 0.9rem;
        }
        .update-date {
          color: var(--text-muted, #64748b);
          font-size: 0.85rem;
          margin: 0.25rem 0 0 0;
        }
        .changelog-box {
          background: rgba(15, 23, 42, 0.6);
          border-radius: 12px;
          padding: 1.2rem 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .changelog-box h4 {
          margin: 0 0 0.75rem 0;
          font-size: 0.95rem;
          color: #a5b4fc;
        }
        .changelog-text p {
          margin: 0.3rem 0;
          color: var(--text-secondary, #cbd5e1);
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .action-row {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .btn-primary-glow {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          border: none;
          padding: 0.8rem 1.6rem;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
        }
        .btn-primary-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(99, 102, 241, 0.6);
        }
        .btn-primary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: #6366f1;
          color: white;
          border: none;
          padding: 0.7rem 1.4rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 255, 255, 0.08);
          color: var(--text-primary, #f8fafc);
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 0.7rem 1.3rem;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s ease;
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .progress-bar-container {
          width: 100%;
          max-width: 400px;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          margin-top: 0.5rem;
        }
        .progress-bar-indeterminate {
          width: 50%;
          height: 100%;
          background: linear-gradient(90deg, #6366f1, #a855f7);
          border-radius: 4px;
          animation: progressIndeterminate 1.5s infinite ease-in-out;
        }
        .web-notice-card {
          display: flex;
          align-items: flex-start;
          gap: 1.25rem;
          padding: 1.75rem 2rem;
          border-radius: 16px;
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.6) 0%, rgba(15, 23, 42, 0.8) 100%);
          border: 1px solid rgba(99, 102, 241, 0.25);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 0 20px rgba(99, 102, 241, 0.08);
          position: relative;
          overflow: hidden;
        }
        .web-notice-card::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(180deg, #6366f1 0%, #a855f7 100%);
        }
        .web-notice-card h4 {
          margin: 0 0 0.5rem 0;
          font-size: 1.15rem;
          font-weight: 700;
          color: #f8fafc;
        }
        .web-notice-card p {
          margin: 0 0 0.35rem 0;
          font-size: 0.9rem;
          color: #cbd5e1;
          line-height: 1.5;
        }
        .web-notice-card p:last-child {
          margin-bottom: 0;
          color: #94a3b8;
        }
        .info-footer-card {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
          padding: 1.2rem 1.5rem;
          border-radius: 12px;
          background: rgba(30, 41, 59, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .info-icon {
          color: #10b981;
          flex-shrink: 0;
          margin-top: 0.2rem;
        }
        .info-footer-card h4 {
          margin: 0 0 0.3rem 0;
          font-size: 0.95rem;
        }
        .info-footer-card p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--text-muted, #94a3b8);
          line-height: 1.5;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(0.95); }
        }
        @keyframes progressIndeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default UpdatePage;
