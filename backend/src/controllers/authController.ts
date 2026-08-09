import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../utils/validators';
import * as authService from '../services/authService';
import { env } from '../config/env';

const REFRESH_COOKIE_NAME = 'studyvault_refresh';

function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.IS_PROD,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: `${env.API_PREFIX}/auth`,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.IS_PROD,
    sameSite: 'lax',
    path: `${env.API_PREFIX}/auth`,
  });
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw ApiError.badRequest(issue.message, 'VALIDATION_ERROR', parseResult.error.format());
    }

    const { user, accessToken, refreshToken } = await authService.registerUser(parseResult.data);
    setRefreshTokenCookie(res, refreshToken);

    sendSuccess(res, { user, accessToken, refreshToken }, 201);
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw ApiError.badRequest(issue.message, 'VALIDATION_ERROR', parseResult.error.format());
    }

    const { user, accessToken, refreshToken } = await authService.loginUser(parseResult.data);
    setRefreshTokenCookie(res, refreshToken);

    sendSuccess(res, { user, accessToken, refreshToken }, 200);
  } catch (error) {
    next(error);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;

    if (!token) {
      throw ApiError.unauthorized('Jeton de rafraîchissement absent.', 'NO_REFRESH_TOKEN');
    }

    const { user, accessToken, refreshToken } = await authService.refreshSession(token);
    setRefreshTokenCookie(res, refreshToken);

    sendSuccess(res, { user, accessToken, refreshToken }, 200);
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies[REFRESH_COOKIE_NAME] || req.body.refreshToken;
    await authService.logoutUser(token);
    clearRefreshTokenCookie(res);

    sendSuccess(res, { message: 'Déconnexion réussie.' }, 200);
  } catch (error) {
    clearRefreshTokenCookie(res);
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw ApiError.badRequest(issue.message, 'VALIDATION_ERROR');
    }

    const result = await authService.requestPasswordReset(parseResult.data.email);

    sendSuccess(
      res, 
      { 
        message: 'Si cette adresse email est enregistrée, des instructions de réinitialisation ont été envoyées.',
        ...(env.IS_DEV && result.resetToken ? { debugToken: result.resetToken } : {})
      }, 
      200
    );
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw ApiError.badRequest(issue.message, 'VALIDATION_ERROR');
    }

    await authService.resetPassword(parseResult.data);
    clearRefreshTokenCookie(res);

    sendSuccess(res, { message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.' }, 200);
  } catch (error) {
    next(error);
  }
}
