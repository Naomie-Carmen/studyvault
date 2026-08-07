import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { academicProfileSchema, semesterPatchSchema } from '../utils/validators';
import * as academicService from '../services/academicProfileService';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const profile = await academicService.getAcademicProfile(req.user.id);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const parseResult = academicProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw ApiError.badRequest(issue.message, 'VALIDATION_ERROR', parseResult.error.format());
    }

    const profile = await academicService.upsertAcademicProfile(req.user.id, parseResult.data);
    sendSuccess(res, profile, 200);
  } catch (error) {
    next(error);
  }
}

export async function getUniversities(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const universities = await academicService.getSuggestedUniversities();
    sendSuccess(res, universities, 200);
  } catch (error) {
    next(error);
  }
}

export async function patchSemester(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      throw ApiError.unauthorized();
    }

    const { id } = req.params;
    const parseResult = semesterPatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw ApiError.badRequest('Paramètres invalides.');
    }

    const updatedSemester = await academicService.updateSemesterStatus(req.user.id, id, parseResult.data);
    sendSuccess(res, updatedSemester, 200);
  } catch (error) {
    next(error);
  }
}
