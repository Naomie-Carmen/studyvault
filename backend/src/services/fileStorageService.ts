import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ApiError } from '../utils/apiError';

const STORAGE_ROOT = path.join(process.cwd(), 'storage', 'uploads');
export const USER_QUOTA_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

export async function storeUserFile(
  userId: string,
  tempFilePath: string,
  originalName: string
): Promise<{ finalPath: string; size: number }> {
  if (!fs.existsSync(tempFilePath)) {
    throw ApiError.badRequest('Fichier temporaire introuvable.');
  }

  const stats = fs.statSync(tempFilePath);
  const size = stats.size;

  // Build target directory for user
  const userDir = path.join(STORAGE_ROOT, userId);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }

  const fileExt = path.extname(originalName) || '';
  const fileUuid = crypto.randomUUID();
  const targetFileName = `${fileUuid}${fileExt}`;
  const targetPath = path.join(userDir, targetFileName);

  // Move file from temp to final user directory
  fs.renameSync(tempFilePath, targetPath);

  return {
    finalPath: targetPath,
    size,
  };
}

export function deletePhysicalFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error(`Failed to delete physical file at ${filePath}:`, err);
  }
}

export function getFileStream(filePath: string): fs.ReadStream {
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound('Fichier introuvable sur le disque.');
  }
  return fs.createReadStream(filePath);
}
