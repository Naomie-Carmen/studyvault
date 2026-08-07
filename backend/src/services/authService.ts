import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { RegisterInput, LoginInput, ResetPasswordInput } from '../utils/validators';
import { UserProfileResponse, AuthTokens } from '../types/auth';

const prisma = new PrismaClient();

function sanitizeUser(user: {
  id: string;
  email: string;
  fullName: string;
  university?: string | null;
  program?: string | null;
  level?: string | null;
  createdAt: Date;
}): UserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    university: user.university,
    program: user.program,
    level: user.level,
    createdAt: user.createdAt.toISOString(),
  };
}

export async function registerUser(input: RegisterInput): Promise<{ user: UserProfileResponse } & AuthTokens> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw ApiError.badRequest('Un compte existe déjà avec cette adresse email.', 'EMAIL_EXISTS');
  }
  // Beta Closed validation
  const isBetaActive = true;
  if (process.env.BETA_CLOSED === 'true' && !input.inviteCode) {
    throw ApiError.forbidden('Bêta fermée - accès sur invitation uniquement. Rejoignez la liste d\'attente !', 'BETA_CLOSED_REQUIRED');
  }

  if (input.inviteCode) {
    const invite = await prisma.betaInvite.findUnique({ where: { inviteCode: input.inviteCode } });
    if (!invite || invite.status === 'used' || (invite.expiresAt && new Date() > invite.expiresAt)) {
      throw ApiError.badRequest('Code d\'invitation bêta invalide ou expiré.', 'INVALID_BETA_INVITE');
    }
    // Mark invite as used
    await prisma.betaInvite.update({
      where: { inviteCode: input.inviteCode },
      data: { status: 'used' },
    });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      university: input.university || null,
      program: input.program || null,
      level: input.level || null,
      betaStatus: isBetaActive ? 'active' : 'none',
      betaInviteCode: input.inviteCode || null,
      betaActivatedAt: isBetaActive ? new Date() : null,
    },
  });

  const authUserPayload = { id: user.id, email: user.email, fullName: user.fullName };
  const accessToken = generateAccessToken(authUserPayload);
  const refreshToken = generateRefreshToken(authUserPayload);

  // Store refresh token in database (expires in 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function loginUser(input: LoginInput): Promise<{ user: UserProfileResponse } & AuthTokens> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  // Non-revealing error message
  if (!user) {
    throw ApiError.badRequest('Identifiants invalides.', 'INVALID_CREDENTIALS');
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw ApiError.badRequest('Identifiants invalides.', 'INVALID_CREDENTIALS');
  }

  const authUserPayload = { id: user.id, email: user.email, fullName: user.fullName };
  const accessToken = generateAccessToken(authUserPayload);
  const refreshToken = generateRefreshToken(authUserPayload);

  // Store new refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt,
    },
  });

  return {
    user: sanitizeUser(user),
    accessToken,
    refreshToken,
  };
}

export async function refreshSession(refreshTokenInput: string): Promise<{ user: UserProfileResponse } & AuthTokens> {
  try {
    verifyRefreshToken(refreshTokenInput);
  } catch (_err) {
    throw ApiError.unauthorized('Session expirée ou invalide. Veuillez vous re-connecter.', 'INVALID_REFRESH_TOKEN');
  }

  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenInput },
    include: { user: true },
  });

  if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
    throw ApiError.unauthorized('Session révoquée ou expirée.', 'REVOKED_REFRESH_TOKEN');
  }

  // Revoke previous refresh token (Rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { isRevoked: true },
  });

  const authUserPayload = {
    id: storedToken.user.id,
    email: storedToken.user.email,
    fullName: storedToken.user.fullName,
  };

  const newAccessToken = generateAccessToken(authUserPayload);
  const newRefreshToken = generateRefreshToken(authUserPayload);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: storedToken.user.id,
      expiresAt,
    },
  });

  return {
    user: sanitizeUser(storedToken.user),
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}

export async function logoutUser(refreshTokenInput?: string): Promise<void> {
  if (refreshTokenInput) {
    try {
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenInput },
        data: { isRevoked: true },
      });
    } catch (_err) {
      // Ignore if token not found
    }
  }
}

export async function requestPasswordReset(email: string): Promise<{ resetToken?: string }> {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Non-revealing: resolve gracefully even if user doesn't exist
  if (!user) {
    return {};
  }

  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, isUsed: false },
    data: { isUsed: true },
  });

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // Valid 1 hour

  await prisma.passwordResetToken.create({
    data: {
      token: resetToken,
      userId: user.id,
      expiresAt,
    },
  });

  return { resetToken };
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const resetTokenRecord = await prisma.passwordResetToken.findUnique({
    where: { token: input.token },
    include: { user: true },
  });

  if (!resetTokenRecord || resetTokenRecord.isUsed || resetTokenRecord.expiresAt < new Date()) {
    throw ApiError.badRequest('Jeton de réinitialisation invalide ou expiré.', 'INVALID_RESET_TOKEN');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, 12);

  // Update user password and mark reset token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetTokenRecord.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetTokenRecord.id },
      data: { isUsed: true },
    }),
    // Revoke all refresh tokens for security
    prisma.refreshToken.updateMany({
      where: { userId: resetTokenRecord.userId },
      data: { isRevoked: true },
    }),
  ]);
}

export async function getUserProfile(userId: string): Promise<UserProfileResponse> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable.');
  }

  return sanitizeUser(user);
}
