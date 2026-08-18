import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Globe, 
  Moon, 
  Sun, 
  Monitor, 
  ShieldCheck, 
  Info, 
  FileText, 
  ChevronRight, 
  Check, 
  Layers, 
  BookOpen, 
  Download, 
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL, fetchApi, getClientAccessToken } from '../services/apiClient';
import { LegalModal } from '../components/legal/LegalModal';

interface SettingsPageProps {
  onNavigate?: (tab: string) => void;
}

const STRUCTURE_MODE_KEY = 'studyvault_structure_mode';

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();
  const { logout, user } = useAuth();

  const [currentLang, setCurrentLang] = useState<string>(i18n.language || 'fr');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('studyvault_theme') as 'light' | 'dark' | 'system') || 'dark';
  });

  const [structureMode, setStructureMode] = useState<'ecue_is_subject' | 'ecue_has_subjects'>(() => {
    return (localStorage.getItem(STRUCTURE_MODE_KEY) as 'ecue_is_subject' | 'ecue_has_subjects') || 'ecue_is_subject';
  });

  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleStructureModeChange = (mode: 'ecue_is_subject' | 'ecue_has_subjects') => {
    setStructureMode(mode);
    localStorage.setItem(STRUCTURE_MODE_KEY, mode);
  };

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(theme);
    }
  };

  useEffect(() => {
    applyTheme(themeMode);
  }, [themeMode]);

  const handleLanguageChange = (lang: string) => {
    setCurrentLang(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('studyvault_language', lang);
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    localStorage.setItem('studyvault_theme', mode);
  };

  const handleNav = (tab: string) => {
    if (onNavigate) onNavigate(tab);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const token = getClientAccessToken();
      const res = await fetch(`${API_BASE_URL}/user/me/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `studyvault-donnees-export-${user?.id || 'me'}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        alert('Erreur lors de l\'exportation des données.');
      }
    } catch (_err) {
      alert('Erreur réseau lors de l\'exportation.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const res = await fetchApi('/user/me', {
        method: 'DELETE',
      });
      if (res.success) {
        alert('Votre compte a été supprimé. Vos données seront archivées 12 mois puis purgées définitivement.');
        logout();
      } else {
        alert(res.error?.message || 'Erreur lors de la suppression du compte.');
      }
    } catch (_err) {
      alert('Erreur réseau.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header glass-card">
        <div className="header-info">
          <h1>{t('settings.title', 'Paramètres & Mentions Légales')}</h1>
          <p className="subtitle">{t('settings.subtitle', 'Personnalisez votre expérience, gérez la confidentialité et vos droits RGPD/Loi 2013-450')}</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Section 1: Langue d'affichage */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Globe size={22} className="section-icon" />
            <div>
              <h3>{t('settings.language.title', 'Langue d\'affichage')}</h3>
              <p>{t('settings.language.desc', 'Choisissez la langue de l\'interface utilisateur')}</p>
            </div>
          </div>

          <div className="options-group">
            <button
              className={`option-btn ${currentLang === 'fr' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('fr')}
            >
              <span>{t('settings.language.fr', 'Français 🇫🇷')}</span>
              {currentLang === 'fr' && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${currentLang === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              <span>{t('settings.language.en', 'English 🇬🇧')}</span>
              {currentLang === 'en' && <Check size={18} className="check-mark" />}
            </button>
          </div>
        </div>

        {/* Section 2: Apparence et Thème */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Moon size={22} className="section-icon" />
            <div>
              <h3>{t('settings.theme.title', 'Apparence et Thème')}</h3>
              <p>{t('settings.theme.desc', 'Sélectionnez le mode d\'affichage visuel de StudyVault')}</p>
            </div>
          </div>

          <div className="options-group">
            <button
              className={`option-btn ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun size={18} />
              <span>{t('settings.theme.light', 'Clair')}</span>
              {themeMode === 'light' && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon size={18} />
              <span>{t('settings.theme.dark', 'Sombre')}</span>
              {themeMode === 'dark' && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${themeMode === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              <Monitor size={18} />
              <span>{t('settings.theme.system', 'Système')}</span>
              {themeMode === 'system' && <Check size={18} className="check-mark" />}
            </button>
          </div>
        </div>

        {/* Section 3: Structure Académique */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Layers size={22} className="section-icon" />
            <div>
              <h3>{t('settings.structure.title', 'Mode de Structure Académique')}</h3>
              <p>{t('settings.structure.desc', 'Définissez la hiérarchie de vos cours et matières')}</p>
            </div>
          </div>

          <div className="options-group vertical">
            <button
              className={`option-btn ${structureMode === 'ecue_is_subject' ? 'active' : ''}`}
              onClick={() => handleStructureModeChange('ecue_is_subject')}
            >
              <Layers size={20} />
              <div style={{ textAlign: 'left' }}>
                <span className="option-label" style={{ fontWeight: 600 }}>{t('settings.structure.ecueIsSubject', 'ECUE = Matière directe (LMD Classique)')}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.75, display: 'block' }}>
                  {t('settings.structure.ecueIsSubjectDesc', 'Chaque ECUE correspond directement à une matière de cours.')}
                </span>
              </div>
              {structureMode === 'ecue_is_subject' && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${structureMode === 'ecue_has_subjects' ? 'active' : ''}`}
              onClick={() => handleStructureModeChange('ecue_has_subjects')}
            >
              <BookOpen size={20} />
              <div style={{ textAlign: 'left' }}>
                <span className="option-label" style={{ fontWeight: 600 }}>{t('settings.structure.ecueHasSubjects', 'ECUE multi-matières')}</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.75, display: 'block' }}>
                  {t('settings.structure.ecueHasSubjectsDesc', 'Chaque ECUE contient plusieurs sous-matières de cours.')}
                </span>
              </div>
              {structureMode === 'ecue_has_subjects' && <Check size={18} className="check-mark" />}
            </button>
          </div>
        </div>

        {/* Section 4: Mentions Légales, Portabilité & Droits RGPD / Loi 2013-450 */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <ShieldCheck size={22} className="section-icon" />
            <div>
              <h3>📜 Mentions Légales & Confidentialité</h3>
              <p>Conforme à la Loi n° 2013-450 (Côte d'Ivoire) & Autorité ARTCI</p>
            </div>
          </div>

          <div className="links-list">
            <button className="link-item-btn" onClick={() => setLegalModalType('privacy')}>
              <ShieldCheck size={18} className="link-icon text-emerald" />
              <span>Politique de confidentialité</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>

            <button className="link-item-btn" onClick={() => setLegalModalType('terms')}>
              <FileText size={18} className="link-icon text-indigo" />
              <span>Conditions d'utilisation (CGU)</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>

            <button className="link-item-btn" onClick={handleExportData} disabled={isExporting}>
              <Download size={18} className="link-icon text-amber" />
              <span>📦 Exporter mes données (JSON) — Art. 42 Portabilité</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>

            <button className="link-item-btn btn-danger" onClick={() => setShowDeleteModal(true)}>
              <Trash2 size={18} className="link-icon text-red" />
              <span>🗑️ Supprimer mon compte — Droit à l'oubli Art. 41</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>

            <div className="device-notice-box" style={{ marginTop: '0.75rem', padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              🔒 {t('cgu.deviceNotice', 'Un identifiant d\'appareil est utilisé pour appliquer la limite de comptes par appareil.')}
            </div>
          </div>
        </div>

        {/* Section 5: À propos de l'application & Éditeur */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Info size={22} className="section-icon" />
            <div>
              <h3>{t('settings.app.title', 'À propos de l\'application')}</h3>
              <p>StudyVault — Plateforme numérique d'organisation académique</p>
            </div>
          </div>

          <div className="app-info-content">
            <div className="info-row">
              <span className="info-label">Version</span>
              <span className="info-value">v1.2.28 (Bêta Fermée)</span>
            </div>
            <div className="info-row">
              <span className="info-label">Éditeur responsable</span>
              <span className="info-value"><strong>Data Service Mica</strong></span>
            </div>
            <div className="info-row">
              <span className="info-label">Siège social</span>
              <span className="info-value">Abidjan, Côte d'Ivoire 🇨🇮</span>
            </div>
            <div className="info-row">
              <span className="info-label">Contact & DPO</span>
              <span className="info-value text-indigo">data.service.mica@gmail.com</span>
            </div>

            <div className="app-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-secondary" onClick={() => handleNav('changelog')}>
                {t('settings.app.changelogBtn', 'Voir les notes de version')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Markdown Legal Modal */}
      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />

      {/* Confirmation Delete Account Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header text-red">
              <AlertTriangle size={24} />
              <h3>Confirmation de suppression de compte</h3>
            </div>
            <p className="modal-body-text">
              Êtes-vous sûr de vouloir supprimer définitivement votre compte <strong>{user?.email}</strong> ?
              <br /><br />
              <strong>Action irréversible.</strong> Vos données seront archivées pendant 12 mois conformément à la Loi n° 2013-450 relative à la protection des données à caractère personnel en Côte d'Ivoire, puis purgées définitivement.
            </p>
            <div className="modal-footer">
              <button className="btn-modal-cancel" onClick={() => setShowDeleteModal(false)} disabled={isDeleting}>
                Annuler
              </button>
              <button className="btn-modal-confirm-delete" onClick={handleDeleteAccount} disabled={isDeleting}>
                {isDeleting ? 'Suppression...' : '🗑️ Confirmer la suppression'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .settings-page {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .page-header {
          padding: 1.25rem 1.5rem;
          border-radius: 12px;
        }

        .settings-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          gap: 1.25rem;
        }

        .settings-card {
          padding: 1.5rem;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
        }

        .card-header h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 0.2rem 0;
        }

        .card-header p {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }

        .options-group {
          display: flex;
          gap: 0.5rem;
        }

        .options-group.vertical {
          flex-direction: column;
        }

        .option-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding: 0.65rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-secondary);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .option-btn.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
          color: #ffffff;
          font-weight: 600;
        }

        .links-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .link-item-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0.85rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.2);
          color: var(--text-primary);
          font-size: 0.85rem;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
        }

        .link-item-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .link-item-btn.btn-danger:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.4);
        }

        .arrow-icon {
          margin-left: auto;
          color: var(--text-muted);
        }

        .app-info-content {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
          font-size: 0.85rem;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 0.4rem 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }

        .info-label { color: var(--text-muted); }
        .info-value { color: var(--text-primary); }

        .btn-secondary {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          font-size: 0.825rem;
          cursor: pointer;
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1200;
          padding: 1rem;
        }

        .modal-dialog {
          width: 440px;
          padding: 1.5rem;
          border-radius: 14px;
          background: #0f172a;
          border: 1px solid rgba(239, 68, 68, 0.4);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .modal-header {
          display: flex;
          align-items: center;
          gap: 0.65rem;
        }

        .modal-header h3 {
          font-size: 1.1rem;
          font-weight: 700;
          color: #ffffff;
        }

        .modal-body-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.6rem;
        }

        .btn-modal-cancel {
          padding: 0.45rem 0.85rem;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          cursor: pointer;
        }

        .btn-modal-confirm-delete {
          padding: 0.45rem 1rem;
          border-radius: 8px;
          background: #dc2626;
          color: #ffffff;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }

        .text-emerald { color: #34d399; }
        .text-indigo { color: #818cf8; }
        .text-amber { color: #fbbf24; }
        .text-red { color: #f87171; }
      `}</style>
    </div>
  );
};
