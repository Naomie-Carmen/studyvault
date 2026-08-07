import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/useAuth';
import { Mail, Lock, User, GraduationCap, UserPlus, AlertCircle, CheckCircle2, Eye, EyeOff, Ticket } from 'lucide-react';
import { BetaBadge } from '../../components/common/BetaBadge';

interface RegisterPageProps {
  onNavigateLogin: () => void;
  onSuccessRegister?: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onNavigateLogin,
  onSuccessRegister,
}) => {
  const { register, isLoading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [university, setUniversity] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('invite');
    if (code) {
      setInviteCode(code.toUpperCase());
    }
  }, []);

  // Live password validation criteria
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isPasswordValid = hasMinLength && hasLetter && hasNumber;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password) {
      setError('Veuillez remplir les champs obligatoires.');
      return;
    }

    if (!isPasswordValid) {
      setError('Le mot de passe ne respecte pas les critères de sécurité.');
      return;
    }

    const result = await register({
      fullName,
      email,
      password,
      university: university || undefined,
      inviteCode: inviteCode.trim() || undefined,
    });

    if (result.success) {
      if (onSuccessRegister) onSuccessRegister();
    } else {
      setError(result.error || 'Erreur lors de l\'inscription.');
    }
  };

  return (
    <div className="auth-card-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <div className="badge-row">
            <BetaBadge size="md" />
          </div>
          <h2>Créer un Compte Étudiant</h2>
          <p>Rejoignez la Bêta Fermée de StudyVault</p>
        </div>

        {error && (
          <div className="auth-error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="inviteCode">Code d'Invitation Bêta (Optionnel)</label>
            <div className="input-wrapper">
              <Ticket className="input-icon" size={18} />
              <input
                id="inviteCode"
                type="text"
                placeholder="ex: SV-ABC123"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fullName">Nom et Prénom *</label>
            <div className="input-wrapper">
              <User className="input-icon" size={18} />
              <input
                id="fullName"
                type="text"
                placeholder="Léa Bernard"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Universitaire *</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="lea.bernard@etud.univ.fr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="university">Université / École (Optionnel)</label>
            <div className="input-wrapper">
              <GraduationCap className="input-icon" size={18} />
              <input
                id="university"
                type="text"
                placeholder="Université Paris 1 Panthéon-Sorbonne"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de Passe Sécurisé *</label>
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

            {/* Password Validation Checklist */}
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
            <UserPlus size={18} />
            <span>{isLoading ? 'Inscription en cours...' : 'Créer mon compte'}</span>
          </button>
        </form>

        <div className="auth-footer">
          <span>Déjà inscrit ?</span>
          <button className="switch-auth-btn" onClick={onNavigateLogin}>
            Se connecter
          </button>
        </div>
      </div>

      <style>{`
        .auth-card-container {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1rem;
          min-height: 75vh;
        }

        .auth-card {
          width: 100%;
          max-width: 480px;
          padding: 2.5rem 2rem;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
        }

        .auth-header {
          text-align: center;
          margin-bottom: 1.75rem;
        }

        .badge-row {
          display: flex;
          justify-content: center;
          margin-bottom: 0.5rem;
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
          margin-bottom: 1.25rem;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
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
          border-radius: var(--radius-md);
          background: var(--gradient-primary);
          color: #ffffff;
          font-weight: 600;
          font-size: 0.95rem;
          box-shadow: var(--shadow-glow);
          margin-top: 0.5rem;
        }

        .submit-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-footer {
          margin-top: 1.75rem;
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
