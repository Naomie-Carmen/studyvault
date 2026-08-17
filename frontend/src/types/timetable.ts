export interface TimetableSession {
  id: string;
  userId: string;
  subjectId: string;
  subject?: {
    id: string;
    name: string;
    color?: string | null;
  };
  ecueId?: string | null;
  ecue?: {
    id: string;
    title: string;
    code?: string | null;
    instructor?: string | null;
  };
  timetableImportId?: string | null;
  dayOfWeek: number; // 0 = Lundi, 1 = Mardi, ... 6 = Dimanche
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room?: string | null;
  sessionType: string; // CM, TD, TP, EXAM, COMPO, OTHER
  recurrence: 'weekly' | 'biweekly' | 'none';
  color?: string | null;
  notes?: string | null;
  hasConflict?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableImport {
  id: string;
  userId: string;
  filePath: string;
  fileName: string;
  mimeType: string;
  status: string;
  createdAt: string;
}

export interface TimetableStats {
  totalHoursPerWeek: number;
  hoursByType: Record<string, number>;
  busiestDay: { dayOfWeek: number; dayName: string; totalHours: number } | null;
}

export interface WeekArchive {
  id: string;
  userId: string;
  weekStart: string; // YYYY-MM-DD
  data: TimetableSession[];
  createdAt: string;
}
