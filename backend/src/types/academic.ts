export interface SemesterDTO {
  id: string;
  number: number;
  label: string;
  isActive: boolean;
}

export interface AcademicYearDTO {
  id: string;
  yearLabel: string;
  level: string;
  isCurrent: boolean;
  semesters: SemesterDTO[];
}

export interface AcademicProfileDTO {
  university: string;
  program: string;
  level: string;
  academicYear: AcademicYearDTO | null;
  isConfigured: boolean;
}
