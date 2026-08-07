import React from 'react';
import { useAuth } from '../../context/useAuth';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  onNavigateLogin?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, onNavigateLogin }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="protected-loading">
        <RefreshCw size={28} className="spin text-primary" />
        <p>Vérification de la session en cours...</p>
        <style>{`
          .protected-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 50vh;
            gap: 1rem;
            color: var(--text-muted);
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="glass-card protected-fallback">
        <ShieldAlert size={42} className="text-warning" />
        <h2>Accès Réservé aux Étudiants Connectés</h2>
        <p>Veuillez vous connecter pour accéder à votre espace personnel StudyVault.</p>
        
        {onNavigateLogin && (
          <button className="login-redirect-btn" onClick={onNavigateLogin}>
            Se Connecter
          </button>
        )}

        <style>{`
          .protected-fallback {
            max-width: 500px;
            margin: 4rem auto;
            padding: 3rem 2rem;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }

          .protected-fallback h2 {
            font-size: 1.25rem;
          }

          .protected-fallback p {
            font-size: 0.9rem;
            color: var(--text-secondary);
          }

          .text-warning { color: var(--status-warning); }

          .login-redirect-btn {
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            border-radius: var(--radius-md);
            background: var(--gradient-primary);
            color: #ffffff;
            font-weight: 600;
            box-shadow: var(--shadow-glow);
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
};
