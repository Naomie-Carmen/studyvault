export interface IStorageProvider {
  uploadFile(file: { path: string; originalname: string; mimetype: string }, key: string): Promise<string>;
  deleteFile(filePathOrKey: string): Promise<void>;
  getPresignedUrl(filePathOrKey: string, expirySeconds?: number): Promise<string>;
}
