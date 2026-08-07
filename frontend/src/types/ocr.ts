export interface TimetableSuggestionItem {
  id: string;
  timetableImportId: string;
  detectedSubjectName: string;
  matchedSubjectId?: string | null;
  matchedSubjectName?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  sessionType?: 'CM' | 'TD' | 'TP' | 'EXAM' | 'OTHER' | null;
  confidenceScore: number;
  status: 'pending' | 'accepted' | 'rejected' | 'modified';
  createdAt: string;
}

export interface SuggestionStats {
  total: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
}
