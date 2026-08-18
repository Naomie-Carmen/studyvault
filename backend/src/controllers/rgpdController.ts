import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as rgpdService from '../services/rgpdService';

export async function exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const data = await rgpdService.exportUserData(req.user.id);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="studyvault-export-${req.user.id}.json"`);
    res.status(200).json(data);
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const result = await rgpdService.deleteUserAccount(req.user.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function acceptConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const result = await rgpdService.acceptUserConsent(req.user.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function updateConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const { analyticsOptIn, contentAnalysisOptIn } = req.body;
    const consent = await rgpdService.updateUserConsent(req.user.id, {
      analyticsOptIn: Boolean(analyticsOptIn),
      contentAnalysisOptIn: Boolean(contentAnalysisOptIn),
    });
    sendSuccess(res, consent);
  } catch (err) {
    next(err);
  }
}

export async function getConsent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const consent = await rgpdService.getUserConsent(req.user.id);
    sendSuccess(res, consent);
  } catch (err) {
    next(err);
  }
}

export async function getPrivacyPolicy(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const policy = rgpdService.getPrivacyPolicy();
    sendSuccess(res, policy);
  } catch (err) {
    next(err);
  }
}
