import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthUserPayload } from '../types/auth';

export function generateAccessToken(user: AuthUserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    },
    env.JWT_SECRET,
    { expiresIn: '15m' }
  );
}

export function generateRefreshToken(user: AuthUserPayload): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyAccessToken(token: string): AuthUserPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthUserPayload;
}

export function verifyRefreshToken(token: string): { id: string; email: string } {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as { id: string; email: string };
}
