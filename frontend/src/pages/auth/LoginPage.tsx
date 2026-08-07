import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Mail, Lock, Eye, EyeOff, LogIn, AlertCircle, Sparkles } from 'lucide-react';

interface LoginPageProps {
  onNavigateRegister: () => void;
  onNavigateForgotPassword: () => void;
  onSuccessLogin?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onNavigateRegister,
  onNavigateForgotPassword,
  onSuccessLogin,
}) => {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }

    const result = await login({ email, password });
    if (result.success) {
      if (onSuccessLogin) onSuccessLogin();
    } else {
      setError(result.error || 'Identifiants invalides.');
    }
  };

  return (
    <div className="auth-card-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="auth-badge">
            <Sparkles size={14} />
            <span>Espace Étudiant</span>
          </div>
          <h2>Connexion à StudyVault</h2>
          <p>Accédez à votre coffre-fort académique personnel</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Adresse Email Universitaire</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="etudiant@univ.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="label-row">
              <label htmlFor="password">Mot de Passe</label>
              <button
                type="button"
                className="forgot-link"
                onClick={onNavigateForgotPassword}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div className="input-wrapper">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="toggle-password-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isLoading}>
            <LogIn size={18} />
            <span>{isLoading ? 'Connexion en cours...' : 'Se Connecter'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>Pas encore de compte ?</span>
          <button className="switch-auth-btn" onClick={onNavigateRegister}>
            Créer un compte étudiant
          </button>
        </div>
      </div>

      <style>{`
        .auth-card-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          min-height: 70vh;
        }

        .auth-card {
          width: 100%;
          max-width: 440px;
          padding: 2.5rem 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .auth-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.25rem 0.65rem;
          border-radius: var(--radius-full);
          background: rgba(99, 102, 241, 0.12);
          color: var(--primary);
          font-size: 0.75rem;
          font-weight: 600;
          margin-bottom: 0.75rem;
        }

        .auth-header h2 {
          font-size: 1.5rem;
          margin-bottom: 0.35rem;
        }

        .auth-header p {
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .auth-error-alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: var(--radius-md);
          background: var(--status-error-bg);
          border: 1px solid rgba(239, 68, 68, 0.3);
          color: var(--status-error);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .form-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .forgot-link {
          font-size: 0.75rem;
          color: var(--primary);
          font-weight: 500;
        }

        .forgot-link:hover {
          text-decoration: underline;
        }

        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .input-icon {
          position: absolute;
          left: 0.875rem;
          color: var(--text-muted);
          pointer-events: none;
        }

        .input-wrapper input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          transition: border-color var(--transition-fast);
        }

        .input-wrapper input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .toggle-password-btn {
          position: absolute;
          right: 0.875rem;
          color: var(--text-muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .toggle-password-btn:hover {
          color: var(--text-primary);
        }

        .submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          padding: 0.85rem;
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.95rem;
          box-shadow: var(--shadow-glow);
          transition: transform var(--transition-fast), box-shadow var(--transition-fast);
          margin-top: 0.5rem;
        }

        .submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 0 25px rgba(99, 102, 241, 0.4);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 2rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-muted);
        }

        .switch-auth-btn {
          color: var(--primary);
          font-weight: 600;
        }

        .switch-auth-btn:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
};
