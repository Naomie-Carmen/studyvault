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
  role?: string | null;
  createdAt: Date;
}): UserProfileResponse {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    university: user.university,
    program: user.program,
    level: user.level,
    role: user.role || 'user',
    createdAt: user.createdAt.toISOString(),
  };
}

export async function getMaxAccountsPerDevice(): Promise<number> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'maxAccountsPerDevice' } });
  return setting ? Math.max(1, parseInt(setting.value, 10) || 2) : 2;
}

export async function setMaxAccountsPerDevice(val: number): Promise<number> {
  const clamped = Math.max(1, Math.min(10, val));
  await prisma.systemSetting.upsert({
    where: { key: 'maxAccountsPerDevice' },
    create: { key: 'maxAccountsPerDevice', value: String(clamped) },
    update: { value: String(clamped) },
  });
  return clamped;
}

export async function registerUser(input: RegisterInput, deviceId?: string): Promise<{ user: UserProfileResponse } & AuthTokens> {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });
  if (existingUser) {
    throw ApiError.badRequest('Un compte existe déjà avec cette adresse email.', 'EMAIL_EXISTS');
  }

  if (deviceId) {
    const device = await prisma.device.findUnique({
      where: { id: deviceId },
      include: { users: true },
    });

    if (device?.blocked) {
      throw ApiError.forbidden('Cet appareil est bloqué.', 'DEVICE_BLOCKED');
    }

    const maxAllowed = await getMaxAccountsPerDevice();
    const currentAccountsCount = device ? device.users.length : 0;
    if (device && !device.unlimited && currentAccountsCount >= maxAllowed) {
      throw ApiError.forbidden('Limite de comptes atteinte sur cet appareil. Contactez le support.', 'DEVICE_ACCOUNT_LIMIT');
    }
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

  if (deviceId) {
    await prisma.device.upsert({
      where: { id: deviceId },
      create: {
        id: deviceId,
        label: deviceId.startsWith('DESKTOP-') ? 'Application Desktop' : 'Navigateur Web',
        lastSeen: new Date(),
        users: { connect: { id: user.id } },
      },
      update: {
        lastSeen: new Date(),
        users: { connect: { id: user.id } },
      },
    });
  }

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

export async function loginUser(input: LoginInput, deviceId?: string): Promise<{ user: UserProfileResponse } & AuthTokens> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });
  // Non-revealing error message
  if (!user) {
    throw ApiError.badRequest('Identifiants invalides.', 'INVALID_CREDENTIALS');
  }

  if (user.bannedAt) {
    throw ApiError.forbidden('Compte suspendu. Contactez le support.', 'ACCOUNT_BANNED');
  }

  if (deviceId) {
    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (device?.blocked) {
      throw ApiError.forbidden('Cet appareil est bloqué.', 'DEVICE_BLOCKED');
    }
    await prisma.device.upsert({
      where: { id: deviceId },
      create: {
        id: deviceId,
        label: deviceId.startsWith('DESKTOP-') ? 'Application Desktop' : 'Navigateur Web',
        lastSeen: new Date(),
        users: { connect: { id: user.id } },
      },
      update: {
        lastSeen: new Date(),
        users: { connect: { id: user.id } },
      },
    });
  }

  const isValidPassword = await bcrypt.compare(input.password, user.passwordHash);
  if (!isValidPassword) {
    throw ApiError.badRequest('Identifiants invalides.', 'INVALID_CREDENTIALS');
  }

  // Update lastLogin
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

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

  if (storedToken.user.bannedAt) {
    throw ApiError.forbidden('Compte suspendu. Contactez le support.', 'ACCOUNT_BANNED');
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
    where: { userId: user.id },
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