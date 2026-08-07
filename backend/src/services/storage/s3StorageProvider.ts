import { IStorageProvider } from './storageProvider';

export class S3StorageProvider implements IStorageProvider {
  private endpoint: string;
  private bucket: string;

  constructor() {
    this.endpoint = process.env.S3_ENDPOINT || 'https://s3.fr-par.scw.cloud';
    this.bucket = process.env.S3_BUCKET_NAME || 'studyvault-uploads';
  }

  async uploadFile(file: { path: string; originalname: string; mimetype: string }, key: string): Promise<string> {
    const s3Key = `uploads/${key}/${file.originalname}`;
    return `${this.endpoint}/${this.bucket}/${s3Key}`;
  }

  async deleteFile(_filePathOrKey: string): Promise<void> {
    return Promise.resolve();
  }

  async getPresignedUrl(filePathOrKey: string, expirySeconds = 3600): Promise<string> {
    if (filePathOrKey.startsWith('http')) {
      return `${filePathOrKey}?expires=${expirySeconds}`;
    }
    return `${this.endpoint}/${this.bucket}/${filePathOrKey}?expires=${expirySeconds}`;
  }
}
