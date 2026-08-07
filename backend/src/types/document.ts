export interface DocumentDTO {
  id: string;
  userId: string;
  subjectId?: string | null;
  personalFolderId?: string | null;
  originalName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  docType: string; // "cours", "TD", "TP", "examen", "autre"
  status: string;
  isDeleted: boolean;
  deletedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface PersonalFolderDTO {
  id: string;
  userId: string;
  categoryType: string; // "cv", "lettre", "attestation", "diplome", "releve", "autre"
  name: string;
  documentCount?: number;
  createdAt: Date | string;
}

export interface UserQuotaDTO {
  usedBytes: number;
  limitBytes: number;
  usedPercentage: number;
  documentCount: number;
}
