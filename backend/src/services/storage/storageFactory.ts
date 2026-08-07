import { IStorageProvider } from './storageProvider';
import { LocalStorageProvider } from './localStorageProvider';
import { S3StorageProvider } from './s3StorageProvider';

let instance: IStorageProvider | null = null;

export function getStorageProvider(): IStorageProvider {
  if (!instance) {
    const driver = process.env.STORAGE_DRIVER || 'local';
    if (driver === 's3') {
      instance = new S3StorageProvider();
    } else {
      instance = new LocalStorageProvider();
    }
  }
  return instance;
}
