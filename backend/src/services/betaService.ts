import { PrismaClient } from '@prisma/client';
import { sendEmail, buildBetaInviteEmail } from './emailService';

const prisma = new PrismaClient();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'SV-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function createBetaInvite(recipientEmail: string, invitedBy: string = 'admin') {
  const inviteCode = generateCode();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const invite = await prisma.betaInvite.create({
    data: {
      email: recipientEmail,
      inviteCode,
      invitedBy,
      expiresAt,
    },
  });

  // Async email send
  const emailOpts = buildBetaInviteEmail(inviteCode, recipientEmail);
  sendEmail(emailOpts).catch(() => {});

  return invite;
}

export async function validateInviteCode(code: string): Promise<{ valid: boolean; email?: string; message?: string }> {
  if (!code) return { valid: false, message: 'Code d\'invitation manquant.' };

  const invite = await prisma.betaInvite.findUnique({
    where: { inviteCode: code },
  });

  if (!invite) {
    return { valid: false, message: 'Code d\'invitation invalide.' };
  }

  if (invite.status === 'used') {
    return { valid: false, message: 'Ce code d\'invitation a déjà été utilisé.' };
  }

  if (new Date() > invite.expiresAt || invite.status === 'expired') {
    return { valid: false, message: 'Ce code d\'invitation a expiré.' };
  }

  return { valid: true, email: invite.email };
}

export async function markInviteAsUsed(code: string): Promise<void> {
  await prisma.betaInvite.update({
    where: { inviteCode: code },
    data: { status: 'used' },
  }).catch(() => {});
}

export async function joinWaitlist(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const existing = await prisma.waitlist.findUnique({ where: { email } });
    if (existing) {
      return { success: true, message: 'Vous êtes déjà inscrit(e) sur la liste d\'attente.' };
    }

    await prisma.waitlist.create({
      data: { email },
    });

    return { success: true, message: 'Inscription enregistrée ! Nous vous contacterons dès qu\'une place se libère.' };
  } catch (error) {
    return { success: false, message: 'Erreur lors de l\'inscription sur la liste d\'attente.' };
  }
}

export async function getUserBetaStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      betaStatus: true,
      betaInviteCode: true,
      betaActivatedAt: true,
      betaFeedbackCount: true,
    },
  });

  return user;
}
