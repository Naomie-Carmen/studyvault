import logo from '../../assets/logo.png';
import React from 'react';
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
  RotateCcw
} from 'lucide-react';
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
            <button className="mobile-close-btn" onClick={onToggle}>
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
            <span className="section-title">GÉNÉRAL</span>
            
            <button
              className={`nav-item ${selectedTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNav('dashboard')}
            >
              <LayoutDashboard size={18} />
              <span>Tableau de Bord</span>
            </button>

            {isAuthenticated && (
              <button
                className={`nav-item ${selectedTab === 'search' ? 'active' : ''}`}
                onClick={() => handleNav('search')}
              >
                <Search size={18} />
                <span>Recherche Globale</span>
              </button>
            )}
          </div>

          <div className="nav-section">
            <span className="section-title">ESPACE ACADÉMIQUE</span>

            <button
              className={`nav-item ${selectedTab === 'academic-profile' ? 'active' : ''}`}
              onClick={() => handleNav('academic-profile')}
            >
              <GraduationCap size={18} />
              <span>Profil Universitaire</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'academic-structure' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('academic-structure')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? 'Veuillez configurer votre profil d\'abord' : ''}
            >
              <Layers size={18} />
              <span>Arborescence (UE / ECUE / Matières)</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'academic-documents' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('academic-documents')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? 'Veuillez configurer votre profil d\'abord' : ''}
            >
              <FileText size={18} />
              <span>Bibliothèque de Cours</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'timetable' ? 'active' : ''} ${!hasConfiguredProfile ? 'disabled' : ''}`}
              onClick={() => hasConfiguredProfile && handleNav('timetable')}
              disabled={!hasConfiguredProfile}
              title={!hasConfiguredProfile ? 'Veuillez configurer votre profil d\'abord' : ''}
            >
              <Calendar size={18} />
              <span>Emploi du Temps (OCR)</span>
            </button>
          </div>

          <div className="nav-section">
            <span className="section-title">ESPACE CONFIDENTIEL</span>

            <button
              className={`nav-item ${selectedTab === 'personal-vault' ? 'active' : ''}`}
              onClick={() => handleNav('personal-vault')}
            >
              <ShieldCheck size={18} />
              <span>Coffre-fort Personnel</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'privacy-settings' ? 'active' : ''}`}
              onClick={() => handleNav('privacy-settings')}
            >
              <Lock size={18} />
              <span>Confidentialité RGPD</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'my-data' ? 'active' : ''}`}
              onClick={() => handleNav('my-data')}
            >
              <Database size={18} />
              <span>Mes Données</span>
            </button>
          </div>

          <div className="nav-section">
            <span className="section-title">AIDE & RESSOURCES</span>

            <button
              className={`nav-item ${selectedTab === 'changelog' ? 'active' : ''}`}
              onClick={() => handleNav('changelog')}
            >
              <Sparkles size={18} />
              <span>Nouveautés</span>
            </button>

            <button
              className={`nav-item ${selectedTab === 'help' ? 'active' : ''}`}
              onClick={() => handleNav('help')}
            >
              <HelpCircle size={18} />
              <span>Centre d'Aide</span>
            </button>

            {onRestartTour && (
              <button
                className="nav-item"
                onClick={onRestartTour}
                id="sidebar-restart-tour-btn"
              >
                <RotateCcw size={18} />
                <span>Revoir le Guide</span>
              </button>
            )}
          </div>
        </nav>

        {/* Sidebar Footer (Auth Actions) */}
        <div className="sidebar-footer">
          {isAuthenticated ? (
            <button className="nav-item logout-btn" onClick={logout}>
              <LogOut size={18} />
              <span>Se Déconnecter</span>
            </button>
          ) : (
            <div className="auth-buttons-group">
              <button
                className="nav-item login-btn"
                onClick={() => handleNav('login')}
              >
                <LogIn size={18} />
                <span>Se Connecter</span>
              </button>
              <button
                className="nav-item register-btn"
                onClick={() => handleNav('register')}
              >
                <UserPlus size={18} />
                <span>Créer un Compte</span>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
