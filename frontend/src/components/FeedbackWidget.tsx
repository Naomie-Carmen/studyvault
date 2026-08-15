import React, { useState } from 'react';
import { MessageSquarePlus, X, Send, Star, Bug, Lightbulb, Heart, HelpCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { API_BASE_URL, getClientAccessToken } from '../services/apiClient';

type FeedbackType = 'bug' | 'suggestion' | 'love' | 'question';

export const FeedbackWidget: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<FeedbackType>('suggestion');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAuthenticated) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) {
      setError('Veuillez saisir votre message.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        type,
        message: message.trim(),
        rating,
        pageUrl: window.location.pathname,
        browserInfo: `${navigator.userAgent}`,
        osInfo: navigator.platform,
        appVersion: '1.0.0',
      };

      const res = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getClientAccessToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSubmittedSuccess(true);
        setTimeout(() => {
          setSubmittedSuccess(false);
          setIsOpen(false);
          setMessage('');
          setRating(null);
        }, 2000);
      } else {
        const json = await res.json();
        setError(json?.error?.message || 'Erreur lors de l\'envoi.');
      }
    } catch {
      setError('Erreur de connexion lors de l\'envoi du retour.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="feedback-widget-container">
      {/* Floating Trigger Button */}
      {!isOpen && (
        <button
          className="feedback-trigger-btn"
          onClick={() => setIsOpen(true)}
          title="Donner votre avis ou signaler un problème"
          id="feedback-widget-trigger-btn"
        >
          <MessageSquarePlus size={20} />
          <span>Feedback Bêta</span>
        </button>
      )}

      {/* Feedback Panel */}
      {isOpen && (
        <div className="feedback-panel glass-card" role="dialog" aria-label="Widget de retours Bêta">
          <div className="feedback-panel-header">
            <div className="title-row">
              <MessageSquarePlus size={18} className="text-indigo" />
              <h3>Votre avis compte pour la Bêta</h3>
            </div>
            <button className="close-btn" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {submittedSuccess ? (
            <div className="feedback-success-box">
              <CheckCircle2 size={36} className="text-green" />
              <p><strong>Merci pour votre retour !</strong></p>
              <small>Votre aide nous permet d'améliorer StudyVault chaque jour.</small>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="feedback-form">
              {error && <div className="feedback-error-msg">{error}</div>}

              {/* Type Selection */}
              <div className="type-selector">
                <button
                  type="button"
                  className={`type-btn ${type === 'bug' ? 'active bug' : ''}`}
                  onClick={() => setType('bug')}
                >
                  <Bug size={14} />
                  <span>Bug</span>
                </button>

                <button
                  type="button"
                  className={`type-btn ${type === 'suggestion' ? 'active suggestion' : ''}`}
                  onClick={() => setType('suggestion')}
                >
                  <Lightbulb size={14} />
                  <span>Idée</span>
                </button>

                <button
                  type="button"
                  className={`type-btn ${type === 'love' ? 'active love' : ''}`}
                  onClick={() => setType('love')}
                >
                  <Heart size={14} />
                  <span>Avis</span>
                </button>

                <button
                  type="button"
                  className={`type-btn ${type === 'question' ? 'active question' : ''}`}
                  onClick={() => setType('question')}
                >
                  <HelpCircle size={14} />
                  <span>Question</span>
                </button>
              </div>

              {/* Star Rating (Optional) */}
              <div className="rating-row">
                <span className="rating-label">Satisfaction :</span>
                <div className="stars">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      className={`star-btn ${rating && rating >= star ? 'filled' : ''}`}
                      onClick={() => setRating(star)}
                    >
                      <Star size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Input */}
              <textarea
                className="feedback-textarea"
                placeholder="Décrivez votre expérience, le problème rencontré ou votre idée d'amélioration..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
              />

              <div className="panel-footer">
                <small className="auto-info">Page et infos système capturées automatiquement</small>
                <button type="submit" className="btn-send-feedback" disabled={submitting}>
                  <Send size={14} />
                  <span>{submitting ? 'Envoi...' : 'Envoyer'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      <style>{`
        body:has(.modal-backdrop) .feedback-widget-container,
        body:has(.modal-card) .feedback-widget-container {
          display: none !important;
        }

        .feedback-widget-container {
          position: fixed;
          bottom: 1.25rem;
          right: 1.25rem;
          z-index: 90;
        }

        .feedback-trigger-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.65rem 1.1rem;
          border-radius: 999px;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          color: #ffffff;
          font-weight: 700;
          font-size: 0.85rem;
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .feedback-trigger-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(168, 85, 247, 0.5);
        }

        .feedback-panel {
          width: 340px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
          border-color: rgba(99, 102, 241, 0.35);
          box-shadow: 0 15px 40px rgba(0,0,0,0.6);
          animation: popUp 0.25s ease;
        }

        @keyframes popUp {
          from { opacity: 0; transform: scale(0.9) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .feedback-panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 0.5rem;
        }
        .title-row { display: flex; align-items: center; gap: 0.5rem; }
        .title-row h3 { font-size: 0.9rem; font-weight: 700; }
        .close-btn { color: var(--text-muted); }
        .close-btn:hover { color: #fff; }

        .type-selector { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.35rem; }
        .type-btn {
          display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
          padding: 0.4rem 0.25rem; border-radius: var(--radius-sm); background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color); font-size: 0.7rem; font-weight: 600; color: var(--text-muted);
        }
        .type-btn:hover { background: rgba(255,255,255,0.08); color: var(--text-primary); }
        .type-btn.active.bug { border-color: #ef4444; color: #ef4444; background: rgba(239,68,68,0.12); }
        .type-btn.active.suggestion { border-color: #6366f1; color: #6366f1; background: rgba(99,102,241,0.12); }
        .type-btn.active.love { border-color: #ec4899; color: #ec4899; background: rgba(236,72,153,0.12); }
        .type-btn.active.question { border-color: #06b6d4; color: #06b6d4; background: rgba(6,182,212,0.12); }

        .rating-row { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); }
        .stars { display: flex; gap: 0.25rem; }
        .star-btn { color: rgba(255,255,255,0.2); transition: color 0.15s ease; }
        .star-btn.filled { color: #fbbf24; }

        .feedback-textarea {
          width: 100%; padding: 0.65rem; background: rgba(0,0,0,0.3); border: 1px solid var(--border-color);
          border-radius: var(--radius-md); color: var(--text-primary); font-size: 0.825rem; outline: none;
          resize: none;
        }
        .feedback-textarea:focus { border-color: var(--primary); }

        .panel-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
        .auto-info { font-size: 0.675rem; color: var(--text-muted); max-width: 170px; line-height: 1.3; }

        .btn-send-feedback {
          display: flex; align-items: center; gap: 0.35rem; padding: 0.45rem 0.85rem;
          border-radius: var(--radius-md); background: var(--gradient-primary); color: #fff;
          font-size: 0.8rem; font-weight: 700; box-shadow: var(--shadow-glow);
        }

        .feedback-success-box { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 2rem 0; text-align: center; }
        .feedback-error-msg { font-size: 0.775rem; color: var(--status-error); background: var(--status-error-bg); padding: 0.4rem 0.6rem; border-radius: var(--radius-sm); }
        .text-indigo { color: var(--primary); }
        .text-green { color: #10b981; }
      `}</style>
    </div>
  );
};
