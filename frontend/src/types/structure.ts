export interface Subject {
  id: string;
  ueId?: string | null;
  ecueId?: string | null;
  name: string;
  instructor?: string | null;
  color?: string | null;
}

export interface ECUE {
  id: string;
  ueId: string;
  code?: string | null;
  title: string;
  ects?: number | null;
  instructor?: string | null;
  subjects: Subject[];
}

export interface UE {
  id: string;
  semesterId: string;
  code?: string | null;
  title: string;
  ects?: number | null;
  ecues: ECUE[];
  directSubjects: Subject[];
}

export interface SemesterTree {
  id: string;
  number: number;
  label: string;
  isActive: boolean;
  ues: UE[];
}

export interface AcademicStructureTree {
  academicYearLabel: string;
  level: string;
  semesters: SemesterTree[];
}

export interface StructureImportItem {
  semesterNumber: number;
  ueTitle: string;
  ueCode?: string;
  ueEcts?: number | null;
  ects?: number | null;
  ecueTitle?: string;
  ecueCode?: string;
  ecueEcts?: number | null;
  subjectName?: string;
  instructor?: string;
}

export interface StructureImportSummary {
  created: {
    ues: number;
    ecues: number;
    subjects: number;
  };
  skipped: {
    ues: number;
    ecues: number;
    subjects: number;
  };
  totalRows: number;
}

