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

export async function listArchives(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const archives = await timetableService.getWeekArchives(req.user.id);
    sendSuccess(res, archives);
  } catch (err) {
    next(err);
  }
}

export async function getArchive(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const archive = await timetableService.getWeekArchive(req.user.id, req.params.weekStart);
    sendSuccess(res, archive);
  } catch (err) {
    next(err);
  }
}

export async function syncArchives(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { currentWeekStart } = req.body;
    if (!currentWeekStart) {
      throw ApiError.badRequest('La date de début de semaine est obligatoire.');
    }
    const archives = await timetableService.syncPastWeekArchives(req.user.id, currentWeekStart);
    sendSuccess(res, archives);
  } catch (err) {
    next(err);
  }
}

export async function duplicateDay(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { sourceDay, targetDays, overwrite } = req.body;

    if (sourceDay === undefined || !Array.isArray(targetDays)) {
      throw ApiError.badRequest('Paramètres sourceDay et targetDays (tableau) obligatoires.');
    }

    const sessions = await timetableService.duplicateDaySessions(
      req.user.id,
      Number(sourceDay),
      targetDays.map(Number),
      Boolean(overwrite)
    );

    sendSuccess(res, { count: sessions.length, sessions }, 201);
  } catch (err) {
    next(err);
  }
}

export async function duplicateSession(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { sessionId, targetDays } = req.body;

    if (!sessionId || !Array.isArray(targetDays)) {
      throw ApiError.badRequest('Paramètres sessionId et targetDays obligatoires.');
    }

    const sessions = await timetableService.duplicateSingleSession(
      req.user.id,
      sessionId,
      targetDays.map(Number)
    );

    sendSuccess(res, { count: sessions.length, sessions }, 201);
  } catch (err) {
    next(err);
  }
}

export async function duplicateWeek(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { targetWeekStarts } = req.body;

    if (!Array.isArray(targetWeekStarts) || targetWeekStarts.length === 0) {
      throw ApiError.badRequest('La liste des dates de début de semaine cibles est obligatoire.');
    }

    const archives = await timetableService.duplicateWeekSchedule(req.user.id, targetWeekStarts);
    sendSuccess(res, { count: archives.length, archives }, 201);
  } catch (err) {
    next(err);
  }
}
