import { DocumentDTO } from './document';

export interface SearchQueryParams {
  q?: string;
  subjectId?: string;
  ueId?: string;
  semesterId?: string;
  docType?: string;
  dateFrom?: string;
  dateTo?: string;
  isFavorite?: boolean;
  personalFolderId?: string;
  tagId?: string;
  page?: number;
  limit?: number;
  sort?: 'relevance' | 'date_asc' | 'date_desc' | 'name_asc' | 'name_desc' | 'size_asc' | 'size_desc';
}

export interface SearchResultDTO {
  documents: DocumentDTO[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FavoriteDTO {
  id: string;
  userId: string;
  documentId: string;
  document: DocumentDTO;
  createdAt: Date | string;
}

export interface QuickAccessDTO {
  id: string;
  userId: string;
  documentId: string;
  position: number;
  document: DocumentDTO;
  createdAt: Date | string;
}

export interface TagDTO {
  id: string;
  userId: string;
  name: string;
  color?: string | null;
  createdAt: Date | string;
}

export interface DashboardStatsDTO {
  totalDocuments: number;
  documentsByType: {
    cours: number;
    TD: number;
    TP: number;
    examen: number;
    autre: number;
  };
  storageUsedBytes: number;
  storageQuotaBytes: number;
  favoritesCount: number;
  quickAccessCount: number;
  recentUploads: DocumentDTO[];
  mostUsedSubjects: { id: string; name: string; documentCount: number }[];
}
