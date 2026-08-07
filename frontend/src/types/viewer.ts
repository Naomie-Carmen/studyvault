import { DocumentItem } from './document';

export interface DocumentMetadata {
  document: DocumentItem;
  pageCountEstimate?: number;
  viewCount: number;
  totalDurationSeconds: number;
  lastViewedAt?: string | null;
  subjectName?: string | null;
  ueTitle?: string | null;
  semesterNumber?: number | null;
}

export interface ViewerState {
  currentPage: number;
  totalPages: number;
  zoom: number; // e.g., 100 = 100%
  rotation: number; // 0, 90, 180, 270
  isFullscreen: boolean;
  isReadingMode: boolean;
  showInfoPanel: boolean;
}
