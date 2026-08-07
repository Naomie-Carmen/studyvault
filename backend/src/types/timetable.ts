export interface TimetableSessionDTO {
  id: string;
  userId: string;
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    color?: string | null;
  };
  timetableImportId?: string | null;
  dayOfWeek: number; // 0 = Lundi, 1 = Mardi, ... 6 = Dimanche
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room?: string | null;
  sessionType: 'CM' | 'TD' | 'TP' | 'EXAM' | 'OTHER';
  recurrence: 'weekly' | 'biweekly' | 'none';
  color?: string | null;
  notes?: string | null;
  hasConflict?: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TimetableImportDTO {
  id: string;
  userId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: Date | string;
}

export interface TimetableStatsDTO {
  totalHoursPerWeek: number;
  hoursByType: {
    CM: number;
    TD: number;
    TP: number;
    EXAM: number;
    OTHER: number;
  };
  busiestDay: { dayOfWeek: number; dayName: string; totalHours: number } | null;
}
