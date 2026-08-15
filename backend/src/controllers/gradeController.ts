import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import * as gradeService from '../services/gradeService';

export async function getConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const config = await gradeService.getGradeConfig(req.user.id);
    sendSuccess(res, config, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { ecueId, types, mode } = req.body;
    const updated = await gradeService.setGradeConfig(req.user.id, ecueId, types, mode);
    sendSuccess(res, updated, 200);
  } catch (error) {
    next(error);
  }
}

export async function upsertGrades(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { ecueId, notes } = req.body;
    const result = await gradeService.saveGrades(req.user.id, ecueId, notes);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function getAverages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const averages = await gradeService.getAverages(req.user.id);
    sendSuccess(res, averages, 200);
  } catch (error) {
    next(error);
  }
}
