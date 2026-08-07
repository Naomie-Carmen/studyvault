export interface Semester {
  id?: string;
  number: number;
  label: string;
  isActive: boolean;
}

export interface AcademicYear {
  id?: string;
  yearLabel: string;
  level: string;
  isCurrent?: boolean;
  semesters: Semester[];
}

export interface AcademicProfile {
  university: string;
  program: string;
  level: string;
  academicYear: AcademicYear | null;
  isConfigured: boolean;
}
