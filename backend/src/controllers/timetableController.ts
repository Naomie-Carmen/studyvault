import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { timetableSessionSchema } from '../utils/validators';
import * as timetableService from '../services/timetableService';
import * as ocrPipeline from '../services/ocr/ocrPipelineService';

export async function createSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const input = timetableSessionSchema.parse(req.body);
    const session = await timetableService.createSession(req.user.id, input);
    sendSuccess(res, session, 201);
  } catch (err) {
    next(err);
  }
}

export async function listSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const { dayOfWeek, subjectId, sessionType } = req.query;
    const sessions = await timetableService.getSessions(req.user.id, {
      dayOfWeek: dayOfWeek !== undefined ? Number(dayOfWeek) : undefined,
      subjectId: subjectId as string,
      sessionType: sessionType as string,
    });

    sendSuccess(res, sessions);
  } catch (err) {
    next(err);
  }
}

export async function getWeek(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const grouped = await timetableService.getWeekSessions(req.user.id);
    sendSuccess(res, grouped);
  } catch (err) {
    next(err);
  }
}

export async function getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const todaySessions = await timetableService.getTodaySessions(req.user.id);
    sendSuccess(res, todaySessions);
  } catch (err) {
    next(err);
  }
}

export async function getUpcoming(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const upcoming = await timetableService.getUpcomingSessions(req.user.id);
    sendSuccess(res, upcoming);
  } catch (err) {
    next(err);
  }
}

export async function updateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const updated = await timetableService.updateSession(req.user.id, req.params.id, req.body);
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

export async function deleteSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    await timetableService.deleteSession(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Séance supprimée.' });
  } catch (err) {
    next(err);
  }
}

export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const stats = await timetableService.getTimetableStats(req.user.id);
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function importFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const file = req.file;
    if (!file) throw ApiError.badRequest('Aucun fichier d\'emploi du temps transmis.');

    const imp = await timetableService.saveTimetableImport(req.user.id, file.path, file.originalname, file.mimetype);
    sendSuccess(res, imp, 201);
  } catch (err) {
    next(err);
  }
}

export async function listImports(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const imports = await timetableService.getTimetableImports(req.user.id);
    sendSuccess(res, imports);
  } catch (err) {
    next(err);
  }
}

// Phase 9 OCR Endpoints
export async function processImport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await ocrPipeline.processTimetableImport(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await ocrPipeline.getSuggestions(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function validateSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { selectedSuggestionIds, corrections } = req.body;
    if (!Array.isArray(selectedSuggestionIds)) {
      throw ApiError.badRequest('La liste des identifiants sélectionnés est obligatoire.');
    }
    const result = await ocrPipeline.validateSuggestions(req.user.id, req.params.id, selectedSuggestionIds, corrections);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function rejectSuggestions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    await ocrPipeline.rejectSuggestions(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Suggestions rejetées.' });
  } catch (err) {
    next(err);
  }
}
