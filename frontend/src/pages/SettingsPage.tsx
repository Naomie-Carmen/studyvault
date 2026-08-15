import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Settings, 
  Languages, 
  Sun, 
  Moon, 
  Monitor, 
  Bell, 
  UserCheck, 
  ShieldCheck, 
  Database, 
  Info, 
  ExternalLink,
  Check,
  ChevronRight
} from 'lucide-react';
import { GradeConfigSection } from '../components/settings/GradeConfigSection';

interface SettingsPageProps {
  onNavigate?: (tab: string) => void;
}

const THEME_KEY = 'studyvault_theme';
const NOTIF_KEY = 'studyvault_desktop_notifications';

const isTauri = typeof window !== 'undefined' && Boolean(
  (window as any).__TAURI__ ||
  (window as any).__TAURI_IPC__ ||
  (window as any).__TAURI_METADATA__ ||
  window.location.protocol.startsWith('tauri') ||
  window.location.protocol.startsWith('asset')
);

export const SettingsPage: React.FC<SettingsPageProps> = ({ onNavigate }) => {
  const { t, i18n } = useTranslation();

  const [currentLang, setCurrentLang] = useState<string>(i18n.language || 'fr');
  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem(THEME_KEY) as 'light' | 'dark' | 'system') || 'dark';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    return localStorage.getItem(NOTIF_KEY) === 'true';
  });

  // Apply theme to document element
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
    localStorage.setItem(THEME_KEY, mode);
    applyTheme(mode);
  };

  const handleToggleNotifications = () => {
    const nextState = !notificationsEnabled;
    setNotificationsEnabled(nextState);
    localStorage.setItem(NOTIF_KEY, String(nextState));
  };

  const handleNav = (tab: string) => {
    if (onNavigate) {
      onNavigate(tab);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-icon">
          <Settings size={24} />
        </div>
        <div className="header-title-box">
          <h1>{t('settings.title', 'Paramètres')}</h1>
          <p className="subtitle">{t('settings.subtitle', 'Personnalisez votre expérience et gérez vos préférences')}</p>
        </div>
      </div>

      <div className="settings-sections">
        {/* Section 1: Langue */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Languages size={22} className="section-icon" />
            <div>
              <h3>{t('settings.language.title', 'Langue d\'affichage')}</h3>
              <p>{t('settings.language.desc', 'Choisissez la langue de l\'interface utilisateur')}</p>
            </div>
          </div>

          <div className="options-grid">
            <button
              className={`option-btn ${currentLang.startsWith('fr') ? 'active' : ''}`}
              onClick={() => handleLanguageChange('fr')}
            >
              <span className="option-flag">🇫🇷</span>
              <span className="option-label">{t('settings.language.fr', 'Français 🇫🇷')}</span>
              {currentLang.startsWith('fr') && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${currentLang.startsWith('en') ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              <span className="option-flag">🇬🇧</span>
              <span className="option-label">{t('settings.language.en', 'English 🇬🇧')}</span>
              {currentLang.startsWith('en') && <Check size={18} className="check-mark" />}
            </button>
          </div>
        </div>

        {/* Section 2: Thème */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Sun size={22} className="section-icon" />
            <div>
              <h3>{t('settings.theme.title', 'Apparence et Thème')}</h3>
              <p>{t('settings.theme.desc', 'Sélectionnez le mode d\'affichage visuel de StudyVault')}</p>
            </div>
          </div>

          <div className="options-grid three-cols">
            <button
              className={`option-btn ${themeMode === 'dark' ? 'active' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <Moon size={20} />
              <span>{t('settings.theme.dark', 'Sombre')}</span>
              {themeMode === 'dark' && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${themeMode === 'light' ? 'active' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <Sun size={20} />
              <span>{t('settings.theme.light', 'Clair')}</span>
              {themeMode === 'light' && <Check size={18} className="check-mark" />}
            </button>

            <button
              className={`option-btn ${themeMode === 'system' ? 'active' : ''}`}
              onClick={() => handleThemeChange('system')}
            >
              <Monitor size={20} />
              <span>{t('settings.theme.system', 'Système')}</span>
              {themeMode === 'system' && <Check size={18} className="check-mark" />}
            </button>
          </div>
        </div>

        {/* Section 3: Notifications Desktop */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Bell size={22} className="section-icon" />
            <div>
              <h3>{t('settings.notifications.title', 'Notifications Desktop')}</h3>
              <p>{t('settings.notifications.desc', 'Recevoir des alertes de l\'application sur votre système')}</p>
            </div>
          </div>

          <div className="toggle-row">
            <div>
              <span className="toggle-status-label">
                {notificationsEnabled
                  ? t('settings.notifications.enabled', 'Notifications activées')
                  : t('settings.notifications.disabled', 'Notifications désactivées')}
              </span>
              {!isTauri && (
                <p className="toggle-web-notice">
                  {t('settings.notifications.webNotice', 'Les notifications natives sont optimisées pour l\'application Desktop StudyVault.')}
                </p>
              )}
            </div>

            <button
              className={`toggle-switch ${notificationsEnabled ? 'on' : ''} ${!isTauri ? 'disabled' : ''}`}
              onClick={handleToggleNotifications}
              disabled={!isTauri}
            >
              <span className="toggle-slider" />
            </button>
          </div>
        </div>

        {/* Section 3.5: Barème de notation */}
        <GradeConfigSection />

        {/* Section 4: Compte & Données */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <UserCheck size={22} className="section-icon" />
            <div>
              <h3>{t('settings.account.title', 'Gestion du Compte et Données')}</h3>
              <p>{t('settings.account.desc', 'Accès rapide aux paramètres de votre profil et confidentialité')}</p>
            </div>
          </div>

          <div className="links-list">
            <button className="link-item-btn" onClick={() => handleNav('academic-profile')}>
              <UserCheck size={18} className="link-icon" />
              <span>{t('settings.account.profileLink', 'Gérer mon profil universitaire')}</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>

            <button className="link-item-btn" onClick={() => handleNav('privacy-settings')}>
              <ShieldCheck size={18} className="link-icon" />
              <span>{t('settings.account.privacyLink', 'Confidentialité & Paramètres RGPD')}</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>

            <button className="link-item-btn" onClick={() => handleNav('my-data')}>
              <Database size={18} className="link-icon" />
              <span>{t('settings.account.myDataLink', 'Consulter et exporter mes données')}</span>
              <ChevronRight size={18} className="arrow-icon" />
            </button>
          </div>
        </div>

        {/* Section 5: À propos de l'application */}
        <div className="glass-card settings-card">
          <div className="card-header">
            <Info size={22} className="section-icon" />
            <div>
              <h3>{t('settings.app.title', 'À propos de l\'application')}</h3>
              <p>StudyVault — Plateforme numérique d'organisation académique</p>
            </div>
          </div>

          <div className="app-info-row">
            <div>
              <span className="info-label">{t('settings.app.version', 'Version actuelle')}</span>
              <span className="info-val">v1.0.3 (Bêta Fermée)</span>
            </div>

            <button className="btn-secondary" onClick={() => handleNav('changelog')}>
              <ExternalLink size={16} />
              <span>{t('settings.app.changelogBtn', 'Voir les notes de version')}</span>
            </button>
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
        .settings-sections {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .settings-card {
          padding: 1.75rem;
          border-radius: 16px;
          background: var(--bg-card, rgba(30, 41, 59, 0.7));
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
          display: flex;
          flex-direction: column;
          gap: 1.2rem;
        }
        .card-header {
          display: flex;
          align-items: flex-start;
          gap: 1rem;
        }
        .section-icon {
          color: #6366f1;
          margin-top: 0.2rem;
          flex-shrink: 0;
        }
        .card-header h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.15rem;
          font-weight: 600;
        }
        .card-header p {
          margin: 0;
          font-size: 0.88rem;
          color: var(--text-muted, #94a3b8);
        }
        .options-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
        }
        .options-grid.three-cols {
          grid-template-columns: repeat(3, 1fr);
        }
        @media (max-width: 640px) {
          .options-grid.three-cols {
            grid-template-columns: 1fr;
          }
        }
        .option-btn {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.9rem 1.2rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
          color: var(--text-primary, #f8fafc);
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          position: relative;
        }
        .option-btn:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
        }
        .option-btn.active {
          background: rgba(99, 102, 241, 0.15);
          border-color: #6366f1;
          color: #818cf8;
          font-weight: 600;
        }
        .option-flag {
          font-size: 1.2rem;
        }
        .check-mark {
          margin-left: auto;
          color: #6366f1;
        }
        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.5rem;
        }
        .toggle-status-label {
          font-weight: 500;
          font-size: 0.95rem;
        }
        .toggle-web-notice {
          font-size: 0.8rem;
          color: var(--text-muted, #64748b);
          margin: 0.3rem 0 0 0;
        }
        .toggle-switch {
          width: 52px;
          height: 28px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          border: none;
          padding: 3px;
          cursor: pointer;
          transition: background 0.3s ease;
          position: relative;
        }
        .toggle-switch.on {
          background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        }
        .toggle-switch.disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .toggle-slider {
          display: block;
          width: 22px;
          height: 22px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s ease;
        }
        .toggle-switch.on .toggle-slider {
          transform: translateX(24px);
        }
        .links-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .link-item-btn {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.9rem 1.2rem;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
          color: var(--text-primary, #f8fafc);
          font-size: 0.92rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .link-item-btn:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateX(4px);
        }
        .link-icon {
          color: #6366f1;
        }
        .arrow-icon {
          margin-left: auto;
          color: var(--text-muted, #64748b);
        }
        .app-info-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 0.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }
        .info-label {
          display: block;
          font-size: 0.85rem;
          color: var(--text-muted, #94a3b8);
          margin-bottom: 0.2rem;
        }
        .info-val {
          font-weight: 600;
          font-size: 0.95rem;
          color: #818cf8;
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
      `}</style>
    </div>
  );
};

export default SettingsPage;
