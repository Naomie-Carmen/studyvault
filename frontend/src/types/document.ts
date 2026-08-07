export interface DocumentItem {
  id: string;
  userId: string;
  subjectId?: string | null;
  personalFolderId?: string | null;
  originalName: string;
  mimeType: string;
  fileSize: number;
  docType: 'cours' | 'TD' | 'TP' | 'examen' | 'autre';
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
