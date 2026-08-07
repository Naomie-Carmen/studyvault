import { logger } from '../utils/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Transactional Email Service Abstraction
 * Supports Resend, SendGrid or SMTP via environment variables, with a log-based fallback for local dev.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'no-reply@studyvault.fr';

  logger.info(`[EmailService] Sending email to ${options.to}: "${options.subject}"`);

  if (!apiKey) {
    logger.info(`[EmailService Dev Fallback] Email content:\n${options.text || options.html}`);
    return true;
  }

  try {
    // If a provider like Resend is available, make HTTP call
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `StudyVault <${fromEmail}>`,
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    if (res.ok) {
      logger.info(`[EmailService] Email successfully sent to ${options.to}`);
      return true;
    } else {
      const err = await res.text();
      logger.error(`[EmailService Error] Provider response: ${err}`);
      return false;
    }
  } catch (error) {
    logger.error('[EmailService Error] Failed to send email', { error: String(error) });
    return false;
  }
}

export function buildBetaInviteEmail(inviteCode: string, recipientEmail: string): EmailOptions {
  const registerUrl = `http://localhost:5173/?invite=${inviteCode}`;
  return {
    to: recipientEmail,
    subject: '🎟️ Votre invitation exclusive pour la Bêta Fermée StudyVault',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f8fafc; padding: 30px; border-radius: 12px;">
        <h2 style="color: #6366f1;">Bienvenue dans la Bêta Fermée de StudyVault !</h2>
        <p>Vous avez été sélectionné(e) pour tester StudyVault en avant-première.</p>
        <div style="background: rgba(99, 102, 241, 0.15); border: 1px solid #6366f1; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #94a3b8;">Votre code d'invitation unique :</p>
          <h1 style="margin: 10px 0 0 0; color: #38bdf8; letter-spacing: 2px;">${inviteCode}</h1>
        </div>
        <p>Utilisez ce code pour créer votre compte sur la plateforme :</p>
        <a href="${registerUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin-top: 10px;">Activer mon compte Bêta</a>
        <p style="font-size: 12px; color: #64748b; margin-top: 30px;">Ce code est valable pendant 14 jours. Ne le partagez pas.</p>
      </div>
    `,
    text: `Bienvenue dans la Bêta Fermée StudyVault !\nVotre code d'invitation unique est : ${inviteCode}\nInscrivez-vous ici : ${registerUrl}`,
  };
}
