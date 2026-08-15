import logo from '../../assets/logo.png';
import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Layers, 
  FileText, 
  Search,
  Calendar,
  ShieldCheck, 
  LogOut, 
  LogIn, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle,
  X,
  Sparkles,
  Lock,
  HelpCircle,
  Database,
  BarChart3,
  RotateCcw,
  RefreshCw,
  Settings,
  Calculator
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/useAuth';
import { useAcademic } from '../../context/useAcademic';
import { BetaBadge } from '../common/BetaBadge';

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  isOpen?: boolean;
  onToggle?: () => void;
  currentView?: string;
  onNavigate?: (view: string) => void;
  onRestartTour?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen = false,
  onToggle,
  currentView,
  onNavigate,
  onRestartTour,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { profile, hasConfiguredProfile } = useAcademic();
  const { t } = useTranslation();
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState<boolean>(false);

  const hasCheckedUpdateRef = useRef(false);

  useEffect(() => {
    if (hasCheckedUpdateRef.current) return;
    hasCheckedUpdateRef.current = true;

    const isTauri = typeof window !== 'undefined' && Boolean(
      (window as any).__TAURI__ ||
      (window as any).__TAURI_IPC__ ||
      (window as any).__TAURI_METADATA__ ||
      window.location.protocol.startsWith('tauri') ||
      window.location.protocol.startsWith('asset')
    );

    if (isTauri) {
      import('@tauri-apps/api/updater')
        .then(({ checkUpdate }) => checkUpdate())
        .then((res) => {
          if (res?.shouldUpdate) {
            setHasUpdateAvailable(true);
          }
        })
        .catch(() => {});
    }
  }, []);

  const selectedTab = activeTab || currentView || 'dashboard';

  const handleNav = (tab: string) => {
    if (onTabChange) onTabChange(tab);
    if (onNavigate) onNavigate(tab);
    if (window.innerWidth < 1024 && onToggle) {
      onToggle();
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && onToggle && <div className="sidebar-backdrop" onClick={onToggle} />}

      <aside className={`sidebar glass-card ${isOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <div className="brand-group" onClick={() => handleNav('dashboard')}>
            <div className="brand-logo">
             <img src={logo} alt="StudyVault" className="logo-img" />
            </div>
            <div className="brand-text">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <h2>StudyVault</h2>
                <BetaBadge size="sm" />
              </div>
              <span className="version-tag">Bêta Fermée v1.0</span>
            </div>
          </div>

          {onToggle && (
            <button className="sidebar-close-btn" onClick={onToggle} aria-label="Fermer le menu" title="Fermer le menu">
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Profile Context Summary */}
        {isAuthenticated && user && (
          <div className="user-profile-summary">
            <div className="avatar">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="user-info">
              <span className="user-name">{user.fullName}</span>
              <span className="user-email">{user.email}</span>

              {hasConfiguredProfile && profile ? (
                <div className="profile-status-badge success">
                  <CheckCircle2 size={12} />
                  <span>{profile.program} ({profile.level})</span>
                </div>
              ) : (
                <div className="profile-status-badge warning">
                  <AlertCircle size={12} />
                  <span>Profil non configuré</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation Sections */}
        <nav className="sidebar-nav">
          <div className="nav-section">
            <span className="section-title">{t('nav.general', 'GÉNÉRAL')}</span>
            
            <button
              className={`nav-item ${selectedTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>{t('nav.dashboard', 'Tableau de Bord')}</span>
            </button>

            {isAuthenticated && (
              <button
                className={`nav-item ${selectedTab === 'search' ? 'active' : ''}`}
                onClick={() => handleNav('search')}
              >
                <Search size={18} />
                <span>{t('nav.search', 'Recherche Globale')}</span>
              </button>
            )}
          </div>

          <div className="nav-section">
            <span className="section-title">{t('nav.academicSpace', 'ESPACE ACADÉMIQUE')}</span>

            <button
              className={`nav-item ${selectedTab === 'academic-profile' ? 'active' : ''}`}
              onClick={() => handleNav('academic-profile')}
            >
              <GraduationCap size={18} />
              <span>{t('nav.academicProfile', 'Profil Universitaire')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'academic-structure' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('academic-structure')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? t('nav.profileRequired', 'Veuillez configurer votre profil d\'abord') : ''}
            >
              <Layers size={18} />
              <span>{t('nav.academicStructure', 'Arborescence (UE / ECUE / Matières)')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'academic-documents' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('academic-documents')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? t('nav.profileRequired', 'Veuillez configurer votre profil d\'abord') : ''}
            >
              <FileText size={18} />
              <span>{t('nav.academicDocuments', 'Bibliothèque de Cours')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'timetable' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('timetable')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? t('nav.profileRequired', 'Veuillez configurer votre profil d\'abord') : ''}
            >
              <Calendar size={18} />
              <span>{t('nav.timetable', 'Emploi du Temps (OCR)')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'grades' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('grades')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? t('nav.profileRequired', 'Veuillez configurer votre profil d\'abord') : ''}
            >
              <Calculator size={18} />
              <span>{t('nav.grades', 'Notes & Moyennes')}</span>
            </button>
          </div>

          <div className="nav-section">
            <span className="section-title">{t('nav.confidentialSpace', 'ESPACE CONFIDENTIEL')}</span>

            <button
              className={`nav-item ${selectedTab === 'personal-vault' ? 'active' : ''}`}
              onClick={() => handleNav('personal-vault')}
            >
              <ShieldCheck size={18} />
              <span>{t('nav.personalVault', 'Coffre-fort Personnel')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'privacy-settings' ? 'active' : ''}`}
              onClick={() => handleNav('privacy-settings')}
            >
              <Lock size={18} />
              <span>{t('nav.privacySettings', 'Confidentialité RGPD')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'my-data' ? 'active' : ''}`}
              onClick={() => handleNav('my-data')}
            >
              <Database size={18} />
              <span>{t('nav.myData', 'Mes Données')}</span>
            </button>
          </div>

          {isAuthenticated && user?.role === 'admin' && (
            <div className="nav-section">
              <span className="section-title">{t('nav.administration', 'ADMINISTRATION')}</span>
              <button
                className={`nav-item ${selectedTab === 'admin-dashboard' ? 'active' : ''}`}
                onClick={() => handleNav('admin-dashboard')}
              >
                <BarChart3 size={18} />
                <span>{t('nav.adminDashboard', 'Dashboard Bêta (Admin)')}</span>
              </button>
            </div>
          )}

          <div className="nav-section">
            <span className="section-title">{t('nav.helpResources', 'AIDE & RESSOURCES')}</span>

            <button
              className={`nav-item ${selectedTab === 'updates' ? 'active' : ''}`}
              onClick={() => handleNav('updates')}
              style={{ position: 'relative' }}
            >
              <RefreshCw size={18} />
              <span>{t('nav.updates', 'Mises à jour')}</span>
              {hasUpdateAvailable && (
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#f97316',
                    marginLeft: 'auto',
                    boxShadow: '0 0 6px rgba(249, 115, 22, 0.8)',
                  }}
                  title={t('nav.updateAvailable', 'Mise à jour disponible')}
                />
              )}
            </button>

            <button
              className={`nav-item ${selectedTab === 'changelog' ? 'active' : ''}`}
              onClick={() => handleNav('changelog')}
            >
              <Sparkles size={18} />
              <span>{t('nav.changelog', 'Nouveautés')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'help' ? 'active' : ''}`}
              onClick={() => handleNav('help')}
            >
              <HelpCircle size={18} />
              <span>{t('nav.help', 'Centre d\'Aide')}</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'settings' ? 'active' : ''}`}
              onClick={() => handleNav('settings')}
            >
              <Settings size={18} />
              <span>{t('nav.settings', 'Paramètres')}</span>
            </button>

            {onRestartTour && (
              <button
                className="nav-item"
                onClick={onRestartTour}
                id="sidebar-restart-tour-btn"
              >
                <RotateCcw size={18} />
                <span>{t('nav.restartTour', 'Revoir le Guide')}</span>
              </button>
            )}
          </div>
        </nav>

        {/* Sidebar Footer (Auth Actions) */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <button className="nav-item logout-btn" onClick={logout}>
              <LogOut size={18} />
              <span>{t('nav.logout', 'Se Déconnecter')}</span>
            </button>
          ) : (
            <div className="auth-buttons-group">
              <button
                className="nav-item login-btn"
                onClick={() => handleNav('login')}
              >
                <LogIn size={18} />
                <span>{t('nav.login', 'Se Connecter')}</span>
              </button>
              <button
                className="nav-item register-btn"
                onClick={() => handleNav('register')}
              >
                <UserPlus size={18} />
                <span>{t('nav.register', 'Créer un Compte')}</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};