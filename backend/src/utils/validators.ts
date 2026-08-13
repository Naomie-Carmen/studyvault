import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .lowercase()
    .email({ message: 'Adresse email invalide.' }),
  password: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
    .regex(/[a-zA-Z]/, { message: 'Le mot de passe doit contenir au moins une lettre.' })
    .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre.' }),
  fullName: z
    .string()
    .trim()
    .min(2, { message: 'Le nom complet doit contenir au moins 2 caractères.' })
    .max(100, { message: 'Le nom complet ne peut pas dépasser 100 caractères.' }),
  university: z.string().trim().optional(),
  program: z.string().trim().optional(),
  level: z.string().trim().optional(),
  inviteCode: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .lowercase()
    .email({ message: 'Adresse email invalide.' }),
  password: z
    .string()
    .min(1, { message: 'Le mot de passe est obligatoire.' }),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .lowercase()
    .email({ message: 'Adresse email invalide.' }),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Le jeton de réinitialisation est obligatoire.' }),
  newPassword: z
    .string()
    .min(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
    .regex(/[a-zA-Z]/, { message: 'Le mot de passe doit contenir au moins une lettre.' })
    .regex(/[0-9]/, { message: 'Le mot de passe doit contenir au moins un chiffre.' }),
});

export const semesterInputSchema = z.object({
  number: z.number().int().min(1).max(12),
  label: z.string().trim().min(1, { message: 'Le nom du semestre est obligatoire.' }),
  isActive: z.boolean().default(true),
});

export const academicProfileSchema = z.object({
  university: z
    .string()
    .trim()
    .min(2, { message: 'L\'université / établissement est obligatoire.' }),
  program: z
    .string()
    .trim()
    .min(2, { message: 'La formation / spécialité est obligatoire.' }),
  level: z.enum([
    'L1',
    'L2',
    'L3',
    'M1',
    'M2',
    'DUT/BUT',
    'BTS',
    'Licence Pro',
    'Doctorat',
    'Autre',
  ], { message: 'Veuillez sélectionner un niveau académique valide.' }),
  yearLabel: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{4}$/, { message: 'L\'année universitaire doit être au format YYYY-YYYY (ex: 2025-2026).' }),
  semesters: z
    .array(semesterInputSchema)
    .min(1, { message: 'Au moins un semestre doit être défini.' }),
});

export const semesterPatchSchema = z.object({
  isActive: z.boolean(),
});

// Phase 4 - UE / ECUE / Subject Schemas
export const ueSchema = z.object({
  semesterId: z.string().min(1, { message: 'Le semestre est obligatoire.' }),
  title: z.string().trim().min(2, { message: 'L\'intitulé de l\'UE est obligatoire (min 2 caractères).' }),
  code: z.string().trim().optional(),
  ects: z.number().positive().optional().nullable(),
});

export const ecueSchema = z.object({
  ueId: z.string().min(1, { message: 'L\'UE parente est obligatoire.' }),
  title: z.string().trim().min(2, { message: 'L\'intitulé de l\'ECUE est obligatoire (min 2 caractères).' }),
  code: z.string().trim().optional(),
});

export const subjectSchema = z.object({
  ueId: z.string().optional().nullable(),
  ecueId: z.string().optional().nullable(),
  name: z.string().trim().min(2, { message: 'Le nom de la matière est obligatoire (min 2 caractères).' }),
  instructor: z.string().trim().optional(),
  color: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, { message: 'Couleur Hex invalide.' }).optional(),
}).refine(data => data.ueId || data.ecueId, {
  message: 'La matière doit être rattachée à une UE ou un ECUE.',
  path: ['ueId'],
});

// Phase 5 - Document Schemas
export const personalFolderSchema = z.object({
  categoryType: z.enum(['cv', 'lettre', 'attestation', 'diplome', 'releve', 'autre'], {
    message: 'Catégorie de dossier invalide.',
  }),
  name: z.string().trim().min(2, { message: 'Le nom du dossier doit contenir au moins 2 caractères.' }),
});

export const documentUpdateSchema = z.object({
  originalName: z.string().trim().min(1).optional(),
  docType: z.enum(['cours', 'TD', 'TP', 'examen', 'autre']).optional(),
  subjectId: z.string().nullable().optional(),
  personalFolderId: z.string().nullable().optional(),
});

// Phase 8 - Timetable Schemas
export const timetableSessionSchema = z.object({
  subjectId: z.string().min(1, { message: 'La matière est obligatoire.' }),
  dayOfWeek: z.number().int().min(0).max(6, { message: 'Jour de la semaine invalide (0-6).' }),
  startTime: z.string().regex(/^([01]\d|2[03]):[0-5]\d$/, { message: 'Format d\'heure de début invalide (HH:mm).' }),
  endTime: z.string().regex(/^([01]\d|2[03]):[0-5]\d$/, { message: 'Format d\'heure de fin invalide (HH:mm).' }),
  room: z.string().trim().optional().nullable(),
  sessionType: z.enum(['CM', 'TD', 'TP', 'EXAM', 'OTHER']).default('CM'),
  recurrence: z.enum(['weekly', 'biweekly', 'none']).default('weekly'),
  color: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
}).refine((data) => data.startTime < data.endTime, {
  message: 'L\'heure de début doit être antérieure à l\'heure de fin.',
  path: ['endTime'],
});

// Structure Import Schemas
export const structureImportItemSchema = z.object({
  semesterNumber: z.number().int().min(1).max(12).default(1),
  ueTitle: z.string().trim().min(2, { message: "L'intitulé de l'UE doit contenir au moins 2 caractères." }),
  ueCode: z.string().trim().optional(),
  ects: z.number().positive().optional().nullable(),
  ecueTitle: z.string().trim().min(2).optional(),
  ecueCode: z.string().trim().optional(),
  subjectName: z.string().trim().min(2).optional(),
  instructor: z.string().trim().optional(),
});

export const structureImportBatchSchema = z.object({
  items: z.array(structureImportItemSchema).min(1, { message: "Le lot d'import doit contenir au moins un élément." }).max(500, { message: "Le lot d'import ne peut dépasser 500 éléments." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type AcademicProfileInput = z.infer<typeof academicProfileSchema>;
export type SemesterInput = z.infer<typeof semesterInputSchema>;
export type SemesterPatchInput = z.infer<typeof semesterPatchSchema>;
export type UEInput = z.infer<typeof ueSchema>;
export type ECUEInput = z.infer<typeof ecueSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type PersonalFolderInput = z.infer<typeof personalFolderSchema>;
export type DocumentUpdateInput = z.infer<typeof documentUpdateSchema>;
export type TimetableSessionInput = z.infer<typeof timetableSessionSchema>;
export type StructureImportItem = z.infer<typeof structureImportItemSchema>;
export type StructureImportBatch = z.infer<typeof structureImportBatchSchema>;

