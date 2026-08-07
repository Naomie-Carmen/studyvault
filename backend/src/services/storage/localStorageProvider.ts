import fs from 'fs';
import { IStorageProvider } from './storageProvider';

export class LocalStorageProvider implements IStorageProvider {
  async uploadFile(file: { path: string; originalname: string; mimetype: string }, _key: string): Promise<string> {
    return file.path;
  }

  async deleteFile(filePathOrKey: string): Promise<void> {
    if (fs.existsSync(filePathOrKey)) {
      try {
        fs.unlinkSync(filePathOrKey);
      } catch (_e) {
        /* ignore */
      }
    }
  }

  async getPresignedUrl(filePathOrKey: string, _expirySeconds = 3600): Promise<string> {
    return `/api/v1/documents/${filePathOrKey}/preview`;
  }
}
