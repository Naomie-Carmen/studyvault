import { DocumentItem } from './document';

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

export interface SearchResult {
  documents: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  documentId: string;
  document: DocumentItem;
  createdAt: string;
}

export interface QuickAccessItem {
  id: string;
  userId: string;
  documentId: string;
  position: number;
  document: DocumentItem;
  createdAt: string;
}

export interface TagItem {
  id: string;
  userId: string;
  name: string;
  color?: string | null;
  createdAt: string;
}

export interface DashboardStats {
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
  recentUploads: DocumentItem[];
  mostUsedSubjects: { id: string; name: string; documentCount: number }[];
}
