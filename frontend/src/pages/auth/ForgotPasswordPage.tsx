import React, { useState } from 'react';
import { useAuth } from '../../context/useAuth';
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordPageProps {
  onNavigateLogin: () => void;
  onNavigateResetPassword?: (token: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onNavigateLogin,
  onNavigateResetPassword,
}) => {
  const { forgotPassword, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [debugToken, setDebugToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email.');
      return;
    }

    const res = await forgotPassword({ email });
    if (res.success) {
      setSuccessMessage(res.message || 'Si cette adresse email existe, les instructions ont été envoyées.');
      if (res.debugToken) {
        setDebugToken(res.debugToken);
      }
    } else {
      setError(res.error || 'Une erreur est survenue.');
    }
  };

  return (
    <div className="auth-card-container">
      <div className="glass-card auth-card">
        <button className="back-link-btn" onClick={onNavigateLogin}>
          <ArrowLeft size={16} />
          <span>Retour à la connexion</span>
        </button>

        <div className="auth-header">
          <h2>Mot de passe oublié ?</h2>
          <p>Saisissez votre email pour réinitialiser votre accès</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {successMessage ? (
          <div className="success-box">
            <CheckCircle2 size={28} className="text-success" />
            <p>{successMessage}</p>

            {debugToken && onNavigateResetPassword && (
              <div className="debug-token-box">
                <span className="debug-label">Environnement de Développement (Mode Test) :</span>
                <code>{debugToken}</code>
                <button
                  className="quick-reset-btn"
                  onClick={() => onNavigateResetPassword(debugToken)}
                >
                  Simuler la réinitialisation maintenant ➔
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Universitaire</label>
              <div className="input-wrapper">
                <Mail className="input-icon" size={18} />
                <input
                  id="email"
                  type="email"
                  placeholder="votre.email@etud.univ.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <button type="submit" className="submit-btn" disabled={isLoading}>
              <Send size={16} />
              <span>{isLoading ? 'Envoi en cours...' : 'Envoyer les instructions'}</span>
            </button>
          </form>
        )}

        <style>{`
          .auth-card-container {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem 1rem;
            min-height: 65vh;
          }

          .auth-card {
            width: 100%;
            max-width: 440px;
            padding: 2.5rem 2rem;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            position: relative;
          }

          .back-link-btn {
            display: flex;
            align-items: center;
            gap: 0.35rem;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-bottom: 1.5rem;
            transition: color var(--transition-fast);
          }

          .back-link-btn:hover {
            color: var(--text-primary);
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
            gap: 0.75rem;
            padding: 1.5rem 1rem;
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.25);
            border-radius: var(--radius-md);
          }

          .text-success { color: var(--status-success); }

          .debug-token-box {
            margin-top: 1rem;
            padding: 0.75rem;
            background: rgba(0, 0, 0, 0.3);
            border-radius: var(--radius-md);
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            font-size: 0.75rem;
          }

          .debug-label {
            color: var(--text-muted);
            font-weight: 600;
          }

          .debug-token-box code {
            word-break: break-all;
            color: var(--accent-cyan);
            font-family: monospace;
          }

          .quick-reset-btn {
            margin-top: 0.25rem;
            color: var(--primary);
            font-weight: 600;
            text-align: center;
          }

          .quick-reset-btn:hover {
            text-decoration: underline;
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
          }
        `}</style>
      </div>
    </div>
  );
};
