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
    secure: true,
    sameSite: 'none',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: `${env.API_PREFIX}/auth`,
  });
}

function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
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
    let token: string | undefined = undefined;

    // 1) Priorité 1 : Body { refreshToken }
    if (req.body && typeof req.body.refreshToken === 'string' && req.body.refreshToken.trim()) {
      token = req.body.refreshToken.trim();
    }

    // 2) Priorité 2 : Header Authorization Bearer
    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const headerToken = authHeader.slice(7).trim();
        if (headerToken && headerToken !== 'undefined' && headerToken !== 'null') {
          token = headerToken;
        }
      }
    }

    // 3) Priorité 3 : Cookie HTTP-only en dernier recours
    if (!token && req.cookies && req.cookies[REFRESH_COOKIE_NAME]) {
      token = req.cookies[REFRESH_COOKIE_NAME];
    }

    if (!token) {
      throw ApiError.unauthorized('Refresh token manquant.', 'NO_REFRESH_TOKEN');
    }

    const { user, accessToken, refreshToken } = await authService.refreshSession(token);
    setRefreshTokenCookie(res, refreshToken);

    sendSuccess(res, { user, accessToken, refreshToken }, 200);
  } catch (error) {
    clearRefreshTokenCookie(res);
    if (error instanceof ApiError) {
      next(error);
    } else {
      const errMsg = error instanceof Error ? error.message : 'Refresh token invalide ou expiré.';
      next(ApiError.unauthorized(errMsg || 'Refresh token invalide ou expiré.', 'INVALID_REFRESH_TOKEN'));
    }
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let token: string | undefined = undefined;

    if (req.body && typeof req.body.refreshToken === 'string' && req.body.refreshToken.trim()) {
      token = req.body.refreshToken.trim();
    }

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const headerToken = req.headers.authorization.slice(7).trim();
      if (headerToken && headerToken !== 'undefined' && headerToken !== 'null') {
        token = headerToken;
      }
    }

    if (!token && req.cookies && req.cookies[REFRESH_COOKIE_NAME]) {
      token = req.cookies[REFRESH_COOKIE_NAME];
    }

    if (token) {
      await authService.logoutUser(token);
    }
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
