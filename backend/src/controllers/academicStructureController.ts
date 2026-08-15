import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { ueSchema, ecueSchema, subjectSchema, structureImportBatchSchema } from '../utils/validators';
import * as structureService from '../services/academicStructureService';


export async function getTree(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const tree = await structureService.getFullStructure(req.user.id);
    sendSuccess(res, tree, 200);
  } catch (error) {
    next(error);
  }
}

// UE CRUD Handlers
export async function createUE(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const parseResult = ueSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw ApiError.badRequest(parseResult.error.issues[0].message);
    }
    const ue = await structureService.createUE(req.user.id, parseResult.data);
    sendSuccess(res, ue, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateUE(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    const ue = await structureService.updateUE(req.user.id, id, req.body);
    sendSuccess(res, ue, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteUE(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    await structureService.deleteUE(req.user.id, id);
    sendSuccess(res, { message: 'UE supprimée avec succès.' }, 200);
  } catch (error) {
    next(error);
  }
}

// ECUE CRUD Handlers
export async function createECUE(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const parseResult = ecueSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw ApiError.badRequest(parseResult.error.issues[0].message);
    }
    const ecue = await structureService.createECUE(req.user.id, parseResult.data);
    sendSuccess(res, ecue, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateECUE(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    const ecue = await structureService.updateECUE(req.user.id, id, req.body);
    sendSuccess(res, ecue, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteECUE(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    await structureService.deleteECUE(req.user.id, id);
    sendSuccess(res, { message: 'ECUE supprimé avec succès.' }, 200);
  } catch (error) {
    next(error);
  }
}

// Subject CRUD Handlers
export async function createSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const parseResult = subjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw ApiError.badRequest(parseResult.error.issues[0].message);
    }
    const subject = await structureService.createSubject(req.user.id, parseResult.data);
    sendSuccess(res, subject, 201);
  } catch (error) {
    next(error);
  }
}

export async function updateSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    const subject = await structureService.updateSubject(req.user.id, id, req.body);
    sendSuccess(res, subject, 200);
  } catch (error) {
    next(error);
  }
}

export async function deleteSubject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { id } = req.params;
    await structureService.deleteSubject(req.user.id, id);
    sendSuccess(res, { message: 'Matière supprimée avec succès.' }, 200);
  } catch (error) {
    next(error);
  }
}

export async function importBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const parseResult = structureImportBatchSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw ApiError.badRequest(parseResult.error.issues[0].message);
    }
    const summary = await structureService.importStructureBatch(req.user.id, parseResult.data.items);
    sendSuccess(res, summary, 201);
  } catch (error) {
    next(error);
  }
}

export async function bulkImportStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      throw ApiError.badRequest('La clé "rows" doit être un tableau d\'éléments.');
    }
    const result = await structureService.bulkImportRows(req.user.id, rows);
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

export async function reorderStructure(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { type, id, newParentId, newIndex } = req.body;
    if (!type || !id || newIndex === undefined) {
      throw ApiError.badRequest('Type, id et newIndex sont requis.');
    }
    const result = await structureService.reorderStructureItem(req.user.id, {
      type,
      id,
      newParentId,
      newIndex: Number(newIndex),
    });
    sendSuccess(res, result, 200);
  } catch (error) {
    next(error);
  }
}

