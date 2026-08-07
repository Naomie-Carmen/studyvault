import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Lock, KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ResetPasswordPageProps {
  token?: string;
  onNavigateLogin: () => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  token: initialToken = '',
  onNavigateLogin,
}) => {
  const { resetPassword, isLoading } = useAuth();
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasMinLength = newPassword.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!token.trim()) {
      setError('Jeton de réinitialisation manquant.');
      return;
    }

    if (!isPasswordValid) {
      setError('Le nouveau mot de passe ne respecte pas les règles de sécurité.');
      return;
    }

    const res = await resetPassword({ token, newPassword });
    if (res.success) {
      setSuccessMessage(res.message || 'Mot de passe réinitialisé avec succès !');
    } else {
      setError(res.error || 'Impossible de réinitialiser le mot de passe.');
    }
  };

  return (
    <div className="auth-card-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <h2>Nouveau Mot de Passe</h2>
          <p>Choisissez un mot de passe robuste pour sécuriser vos données</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="success-box">
            <CheckCircle2 size={32} className="text-success" />
            <p>{successMessage}</p>
            <button className="submit-btn" onClick={onNavigateLogin}>
              Se connecter maintenant
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            {!initialToken && (
              <div className="form-group">
                <label htmlFor="token">Code / Jeton de réinitialisation</label>
                <div className="input-wrapper">
                  <KeyRound className="input-icon" size={18} />
                  <input
                    id="token"
                    type="text"
                    placeholder="Collez le jeton ici..."
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="newPassword">Nouveau Mot de Passe *</label>
              <div className="input-wrapper">
                <Lock className="input-icon" size={18} />
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              <div className="password-checklist">
                <div className={`check-item ${hasMinLength ? 'valid' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>Au moins 8 caractères</span>
                </div>
                <div className={`check-item ${hasLetter ? 'valid' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>Au moins une lettre</span>
                </div>
                <div className={`check-item ${hasNumber ? 'valid' : ''}`}>
                  <CheckCircle2 size={13} />
                  <span>Au moins un chiffre</span>
                </div>
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading || !isPasswordValid}>
              <span>{isLoading ? 'Réinitialisation...' : 'Valider le nouveau mot de passe'}</span>
            </button>
          </form>
        )}

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
            margin-bottom: 1.75rem;
          }

          .auth-header h2 {
            font-size: 1.4rem;
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
            margin-bottom: 1.25rem;
          }

          .success-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            gap: 1rem;
            padding: 1.5rem 1rem;
          }

          .text-success { color: var(--status-success); }

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

          .form-group label {
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--text-secondary);
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
          }

          .toggle-password-btn {
            position: absolute;
            right: 0.875rem;
            color: var(--text-muted);
          }

          .password-checklist {
            display: flex;
            gap: 0.75rem;
            margin-top: 0.35rem;
            flex-wrap: wrap;
          }

          .check-item {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            font-size: 0.725rem;
            color: var(--text-muted);
          }

          .check-item.valid {
            color: var(--status-success);
          }

          .submit-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.5rem;
            padding: 0.85rem;
            width: 100%;
            border-radius: var(--radius-md);
            background: var(--gradient-primary);
            color: #ffffff;
            font-weight: 600;
            font-size: 0.95rem;
            box-shadow: var(--shadow-glow);
          }

          .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }
        `}</style>
      </div>
    </div>
  );
};
