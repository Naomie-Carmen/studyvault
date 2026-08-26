import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import { sendSuccess } from '../utils/apiResponse';
import { ApiError } from '../utils/apiError';
import { documentUpdateSchema, personalFolderSchema } from '../utils/validators';
import * as docService from '../services/documentService';
import * as viewService from '../services/documentViewService';
import * as classificationService from '../services/classification/classificationPipelineService';

interface DecodedToken {
  userId: string;
}

export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
}

export async function getCloudStatus(_req: Request, res: Response): Promise<void> {
  const enabled = isR2Configured();
  sendSuccess(res, { enabled }, 200);
}

export async function uploadFiles(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const { subjectId, ecueId, categoryId, personalFolderId, docType, storageType } = req.body;

    if (storageType === 'cloud' && !isR2Configured()) {
      throw ApiError.serviceUnavailable('Stockage cloud non configuré.');
    }

    const rawFiles = req.files;
    const files: Express.Multer.File[] = Array.isArray(rawFiles)
      ? rawFiles
      : rawFiles
      ? (Object.values(rawFiles).flat() as Express.Multer.File[])
      : [];

    const docs = await docService.uploadDocuments(req.user.id, files, {
      subjectId,
      ecueId,
      categoryId,
      personalFolderId,
      docType,
    });

    // Automatically trigger classification analysis for uploaded academic docs without subjectId
    for (const doc of docs) {
      if (!doc.subjectId && !doc.personalFolderId) {
        classificationService.analyzeAndSuggest(req.user.id, doc.id).catch(() => {});
      }
    }

    sendSuccess(res, docs, 201);
  } catch (err) {
    next(err);
  }
}

export async function listDocuments(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const { subjectId, ecueId, categoryId, personalFolderId, docType, search, isPersonalVault } = req.query;

    const docs = await docService.getDocuments(req.user.id, {
      subjectId: subjectId as string,
      ecueId: ecueId as string,
      categoryId: categoryId === 'null' ? null : (categoryId as string),
      personalFolderId: personalFolderId as string,
      docType: docType as string,
      search: search as string,
      isPersonalVault: isPersonalVault === 'true',
    });

    sendSuccess(res, docs);
  } catch (err) {
    next(err);
  }
}

export async function getDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const doc = await docService.getDocumentById(req.user.id, req.params.id);
    sendSuccess(res, doc);
  } catch (err) {
    next(err);
  }
}

function findFileByNameRecursively(dir: string, targetName: string): string | null {
  try {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const found = findFileByNameRecursively(fullPath, targetName);
        if (found) return found;
      } else if (entry.isFile() && entry.name.toLowerCase() === targetName.toLowerCase()) {
        return fullPath;
      }
    }
  } catch (_e) {
    /* ignore */
  }
  return null;
}

function resolveExistingFilePath(doc: any): string | null {
  if (!doc || !doc.filePath) return null;

  if (fs.existsSync(doc.filePath)) {
    return doc.filePath;
  }

  const normalized = path.normalize(doc.filePath);
  if (fs.existsSync(normalized)) {
    return normalized;
  }

  const fileName = path.basename(doc.filePath);
  const storagePath = path.join(process.cwd(), 'storage', 'uploads', doc.userId, fileName);
  if (fs.existsSync(storagePath)) {
    return storagePath;
  }

  const storageRootPath = path.join(process.cwd(), 'storage', 'uploads', fileName);
  if (fs.existsSync(storageRootPath)) {
    return storageRootPath;
  }

  try {
    const os = require('os');
    const homeDir = os.homedir();
    const searchDirs = [
      path.join(homeDir, 'Documents', 'StudyVault'),
      path.join(homeDir, 'OneDrive', 'Documents', 'StudyVault')
    ];
    for (const baseDir of searchDirs) {
      if (fs.existsSync(baseDir)) {
        const found = findFileByNameRecursively(baseDir, doc.originalName);
        if (found) return found;
      }
    }
  } catch (_e) {
    /* ignore search errors */
  }

  return null;
}

export async function previewFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let userId = req.user?.id;
    if (!userId && req.query.token) {
      try {
        const decoded = jwt.verify(
          req.query.token as string,
          process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_dev_mode'
        ) as DecodedToken;
        userId = decoded.userId;
      } catch (_e) {
        throw ApiError.unauthorized('Token de prévisualisation invalide.');
      }
    }

    if (!userId) throw ApiError.unauthorized();

    const doc = await docService.getDocumentById(userId, req.params.id);
    const existingFilePath = resolveExistingFilePath(doc);
    if (!existingFilePath) {
      throw ApiError.notFound('Fichier introuvable sur le serveur.');
    }

    const stat = fs.statSync(existingFilePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const etag = `W/"${fileSize}-${stat.mtime.getTime()}"`;
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return;
    }

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        res.status(416).end();
        return;
      }

      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(existingFilePath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': doc.mimeType,
      });

      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': doc.mimeType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(doc.originalName)}"`,
        'Accept-Ranges': 'bytes',
      });

      fs.createReadStream(existingFilePath).pipe(res);
    }
  } catch (err) {
    next(err);
  }
}

export async function downloadFile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let userId = req.user?.id;
    if (!userId && req.query.token) {
      try {
        const decoded = jwt.verify(
          req.query.token as string,
          process.env.JWT_ACCESS_SECRET || 'fallback_access_secret_for_dev_mode'
        ) as DecodedToken;
        userId = decoded.userId;
      } catch (_e) {
        throw ApiError.unauthorized();
      }
    }

    if (!userId) throw ApiError.unauthorized();

    const doc = await docService.getDocumentById(userId, req.params.id);
    const existingFilePath = resolveExistingFilePath(doc);
    if (!existingFilePath) {
      throw ApiError.notFound('Fichier introuvable sur le serveur.');
    }

    res.download(existingFilePath, doc.originalName);
  } catch (err) {
    next(err);
  }
}

export async function updateDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const input = documentUpdateSchema.parse(req.body);
    const doc = await docService.updateDocument(req.user.id, req.params.id, input);
    sendSuccess(res, doc);
  } catch (err) {
    next(err);
  }
}

export async function softDeleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const doc = await docService.softDeleteDocument(req.user.id, req.params.id);
    sendSuccess(res, doc);
  } catch (err) {
    next(err);
  }
}

export async function restoreDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const doc = await docService.restoreDocument(req.user.id, req.params.id);
    sendSuccess(res, doc);
  } catch (err) {
    next(err);
  }
}

export async function listTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const docs = await docService.getTrashDocuments(req.user.id);
    sendSuccess(res, docs);
  } catch (err) {
    next(err);
  }
}

export async function permanentlyDeleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    await docService.permanentlyDeleteDocument(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Document supprimé définitivement.' });
  } catch (err) {
    next(err);
  }
}

export async function emptyTrash(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const result = await docService.emptyTrash(req.user.id);
    sendSuccess(res, { message: `${result.deletedCount} document(s) supprimé(s) définitivement de la corbeille.` });
  } catch (err) {
    next(err);
  }
}

export async function getQuota(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const quota = await docService.getUserQuota(req.user.id);
    sendSuccess(res, quota);
  } catch (err) {
    next(err);
  }
}

export async function createPersonalFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const input = personalFolderSchema.parse(req.body);
    const folder = await docService.createPersonalFolder(req.user.id, input);
    sendSuccess(res, folder, 201);
  } catch (err) {
    next(err);
  }
}

export async function getPersonalFolders(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    const folders = await docService.getPersonalFolders(req.user.id);
    sendSuccess(res, folders);
  } catch (err) {
    next(err);
  }
}

export async function deletePersonalFolder(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();

    await docService.deletePersonalFolder(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Dossier personnel supprimé.' });
  } catch (err) {
    next(err);
  }
}

// Phase 7 Views & Metadata
export async function recordView(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { durationSeconds } = req.body;
    await viewService.recordDocumentView(req.user.id, req.params.id, durationSeconds);
    sendSuccess(res, { message: 'Événement de lecture enregistré.' });
  } catch (err) {
    next(err);
  }
}

export async function getRecentlyViewed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const docs = await viewService.getRecentlyViewedDocuments(req.user.id);
    sendSuccess(res, docs);
  } catch (err) {
    next(err);
  }
}

export async function getMetadata(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const meta = await viewService.getDocumentMetadata(req.user.id, req.params.id);
    sendSuccess(res, meta);
  } catch (err) {
    next(err);
  }
}

// Phase 10 Classification Endpoints
export async function getClassification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    let sugg = await classificationService.getSuggestion(req.user.id, req.params.id);
    if (!sugg) {
      sugg = await classificationService.analyzeAndSuggest(req.user.id, req.params.id);
    }
    sendSuccess(res, sugg);
  } catch (err) {
    next(err);
  }
}

export async function acceptClassification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await classificationService.acceptSuggestion(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function modifyClassification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { subjectId, docType } = req.body;
    if (!subjectId) throw ApiError.badRequest('La matière est obligatoire.');
    const result = await classificationService.modifySuggestion(req.user.id, req.params.id, subjectId, docType || 'cours');
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function rejectClassification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const result = await classificationService.rejectSuggestion(req.user.id, req.params.id);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function listUnclassified(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const docs = await classificationService.getUnclassifiedDocuments(req.user.id);
    sendSuccess(res, docs);
  } catch (err) {
    next(err);
  }
}

// Category Controllers (Compartiments par ECUE)
export async function listCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const ecueId = req.query.ecueId as string;
    if (!ecueId) throw ApiError.badRequest('L\'identifiant ECUE est obligatoire.');
    const categories = await docService.getCategoriesForEcue(req.user.id, ecueId);
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
}

export async function createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { ecueId, name, order } = req.body;
    if (!ecueId || !name) throw ApiError.badRequest('ecueId et name sont obligatoires.');
    const cat = await docService.createCategory(req.user.id, ecueId, name, order);
    sendSuccess(res, cat, 201);
  } catch (err) {
    next(err);
  }
}

export async function updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { name } = req.body;
    if (!name) throw ApiError.badRequest('Le nom est obligatoire.');
    const cat = await docService.updateCategory(req.user.id, req.params.id, name);
    sendSuccess(res, cat);
  } catch (err) {
    next(err);
  }
}

export async function deleteCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    await docService.deleteCategory(req.user.id, req.params.id);
    sendSuccess(res, { message: 'Compartiment supprimé, documents conservés.' });
  } catch (err) {
    next(err);
  }
}

export async function moveDocumentCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) throw ApiError.unauthorized();
    const { categoryId } = req.body;
    const doc = await docService.moveDocumentCategory(req.user.id, req.params.id, categoryId ?? null);
    sendSuccess(res, doc);
  } catch (err) {
    next(err);
  }
}
