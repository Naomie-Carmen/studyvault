import React from 'react';
import { LogIn, User, LogOut, GraduationCap } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useAcademic } from '../../context/useAcademic';
import { GlobalSearch } from '../search/GlobalSearch';
import { DocumentItem } from '../../types/document';

interface HeaderProps {
  onNavigateLogin?: () => void;
  onNavigateRegister?: () => void;
  onNavigateAcademicProfile?: () => void;
  onNavigateSearch?: (query: string) => void;
  onSelectDocument?: (doc: DocumentItem) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigateLogin,
  onNavigateRegister,
  onNavigateAcademicProfile,
  onNavigateSearch,
  onSelectDocument,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { profile } = useAcademic();

  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo">SV</div>
        <span className="brand-title">StudyVault</span>
        <span className="brand-badge">SaaS</span>
      </div>

      {isAuthenticated && (
        <div className="header-search">
          <GlobalSearch
            onNavigateSearch={onNavigateSearch}
            onSelectDocument={onSelectDocument}
          />
        </div>
      )}

      <div className="header-actions">
        {isAuthenticated ? (
          <div className="user-profile-menu">
            {profile && (
              <button
                className="academic-badge-btn"
                onClick={onNavigateAcademicProfile}
                title="Mon Profil Universitaire"
              >
                <GraduationCap size={15} />
                <span className="badge-text">{profile.university}</span>
              </button>
            )}

            <div className="user-info">
              <User size={16} className="user-icon" />
              <span className="user-name">{user?.fullName}</span>
            </div>

            <button className="logout-btn" onClick={logout} title="Déconnexion">
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <div className="auth-buttons">
            {onNavigateLogin && (
              <button className="btn-secondary" onClick={onNavigateLogin}>
                <LogIn size={16} />
                <span>Connexion</span>
              </button>
            )}
            {onNavigateRegister && (
              <button className="btn-primary" onClick={onNavigateRegister}>
                <span>S'inscrire</span>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .app-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.85rem var(--space-xl);
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border-color);
          position: sticky;
          top: 0;
          z-index: 50;
          gap: 1rem;
        }

        .header-brand {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .brand-logo {
          width: 2rem;
          height: 2rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.875rem;
          color: #ffffff;
          box-shadow: var(--shadow-glow);
        }

        .brand-title {
          font-weight: 700;
          font-size: 1.15rem;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #ffffff 0%, var(--text-secondary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .brand-badge {
          font-size: 0.65rem;
          font-weight: 700;
          padding: 0.1rem 0.35rem;
          border-radius: var(--radius-sm);
          background: rgba(99, 102, 241, 0.15);
          color: var(--primary);
          border: 1px solid rgba(99, 102, 241, 0.3);
        }

        .header-search {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .user-profile-menu {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .academic-badge-btn {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.35rem 0.65rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.12);
          border: 1px solid rgba(99, 102, 241, 0.3);
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.35rem 0.75rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          font-size: 0.825rem;
          font-weight: 500;
        }

        .user-icon {
          color: var(--primary);
        }

        .logout-btn {
          color: var(--text-muted);
          padding: 0.4rem;
          border-radius: var(--radius-md);
          transition: color var(--transition-fast), background var(--transition-fast);
        }

        .logout-btn:hover {
          color: var(--status-error);
          background: rgba(239, 68, 68, 0.1);
        }

        .auth-buttons {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.45rem 0.85rem;
          border-radius: var(--radius-md);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-size: 0.825rem;
          font-weight: 500;
        }

        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.1);
          color: var(--text-primary);
        }

        .btn-primary {
          padding: 0.45rem 1rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-size: 0.825rem;
          font-weight: 600;
          box-shadow: var(--shadow-glow);
        }

        .btn-primary:hover {
          transform: translateY(-1px);
        }
      `}</style>
    </header>
  );
};
