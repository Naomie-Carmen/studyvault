export interface SubjectDTO {
  id: string;
  ueId?: string | null;
  ecueId?: string | null;
  name: string;
  instructor?: string | null;
  color?: string | null;
}

export interface ECUEDTO {
  id: string;
  ueId: string;
  code?: string | null;
  title: string;
  ects?: number | null;
  subjects: SubjectDTO[];
}

export interface UEDTO {
  id: string;
  semesterId: string;
  code?: string | null;
  title: string;
  ects?: number | null;
  ecues: ECUEDTO[];
  directSubjects: SubjectDTO[];
}

export interface SemesterTreeDTO {
  id: string;
  number: number;
  label: string;
  isActive: boolean;
  ues: UEDTO[];
}

export interface AcademicStructureTreeDTO {
  academicYearLabel: string;
  level: string;
  semesters: SemesterTreeDTO[];
}
