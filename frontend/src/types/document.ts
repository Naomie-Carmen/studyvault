export interface DocumentCategoryItem {
  id: string;
  userId: string;
  ecueId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  userId: string;
  subjectId?: string | null;
  ecueId?: string | null;
  categoryId?: string | null;
  category?: DocumentCategoryItem | null;
  personalFolderId?: string | null;
  originalName: string;
  filePath?: string;
  mimeType: string;
  fileSize: number;
  docType: string;
  status: string;
  isDeleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalFolderItem {
  id: string;
  userId: string;
  categoryType: 'cv' | 'lettre' | 'attestation' | 'diplome' | 'releve' | 'autre';
  name: string;
  documentCount?: number;
  createdAt: string;
}

export interface UserQuota {
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
  documentCount: number;
}
