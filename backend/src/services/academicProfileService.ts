import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { AcademicProfileInput, SemesterPatchInput } from '../utils/validators';
import { AcademicProfileDTO, SemesterDTO } from '../types/academic';

const prisma = new PrismaClient();

const DEFAULT_UNIVERSITIES = [
  // 🇨🇮 Côte d'Ivoire — Universités publiques
  'Université Félix Houphouët-Boigny (Abidjan)',
  'Université Alassane Ouattara (Bouaké)',
  'Université Nangui Abrogoua (Abidjan)',
  'Université Jean Lorougnon Guédé (Daloa)',
  'Université Peleforo Gon Coulibaly (Korhogo)',
  'Université de Man',
  'Université de San Pedro',
  'Université de Bondoukou',
  'Université Virtuelle de Côte d\'Ivoire (UVCI)',
  'Institut National Polytechnique Félix Houphouët-Boigny (Yamoussoukro)',
  // 🇨🇮 Côte d'Ivoire — Grandes écoles & institutions
  'École Normale Supérieure (ENS Abidjan)',
  'Institut National Supérieur des Arts et de l\'Action Culturelle (INSAAC)',
  'École Supérieure Africaine des TIC (ESATIC)',
  'Institut National Supérieur de la Jeunesse et des Sports (INSJS)',
  'École Nationale Supérieure de Statistique et d\'Économie Appliquée (ENSEA)',
  // 🇨 Côte d'Ivoire — Établissements privés
  'Université Méthodiste de Côte d\'Ivoire (UMECI)',
  'Université Internationale de Grand-Bassam (UIGB)',
  'Institut Supérieur de Management (ISM Abidjan)',
  'École Supérieure de Commerce d\'Abidjan (ESCA)',
  // 🇫🇷 France & autres
  'Sorbonne Université',
  'Université Paris 1 Panthéon-Sorbonne',
  'Université Paris Cité',
  'Université de Lyon (Claude Bernard / Lumière)',
  'Université d\'Aix-Marseille',
  'Université de Bordeaux',
  'Université de Lille',
  'Université de Strasbourg',
  'Université Toulouse 1 Capitole',
  'Université Paris-Saclay',
];

export async function getAcademicProfile(userId: string): Promise<AcademicProfileDTO> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      academicYears: {
        where: { isCurrent: true },
        include: {
          semesters: {
            orderBy: { number: 'asc' },
          },
        },
        take: 1,
      },
    },
  });

  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable.');
  }

  const currentYear = user.academicYears[0] || null;
  const isConfigured = !!(
    user.university &&
    user.program &&
    user.level &&
    currentYear
  );

  return {
    university: user.university || '',
    program: user.program || '',
    level: user.level || '',
    isConfigured,
    academicYear: currentYear
      ? {
          id: currentYear.id,
          yearLabel: currentYear.yearLabel,
          level: currentYear.level,
          isCurrent: currentYear.isCurrent,
          semesters: currentYear.semesters.map((s) => ({
            id: s.id,
            number: s.number,
            label: s.label,
            isActive: s.isActive,
          })),
        }
      : null,
  };
}

export async function upsertAcademicProfile(
  userId: string,
  input: AcademicProfileInput
): Promise<AcademicProfileDTO> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable.');
  }

  // Store / connect university & program records for global suggestions
  try {
    await prisma.university.upsert({
      where: { name: input.university },
      update: {},
      create: { name: input.university },
    });
  } catch (_e) {
    // Ignore concurrency conflicts
  }

  // Update user profile fields
  await prisma.user.update({
    where: { id: userId },
    data: {
      university: input.university,
      program: input.program,
      level: input.level,
    },
  });

  // Archive any old active academic years for this user
  await prisma.academicYear.updateMany({
    where: { userId, isCurrent: true },
    data: { isCurrent: false },
  });

  // Create new active academic year with semesters
  const academicYear = await prisma.academicYear.create({
    data: {
      userId,
      yearLabel: input.yearLabel,
      level: input.level,
      isCurrent: true,
      semesters: {
        create: input.semesters.map((s) => ({
          number: s.number,
          label: s.label,
          isActive: s.isActive,
        })),
      },
    },
    include: {
      semesters: {
        orderBy: { number: 'asc' },
      },
    },
  });

  return {
    university: input.university,
    program: input.program,
    level: input.level,
    isConfigured: true,
    academicYear: {
      id: academicYear.id,
      yearLabel: academicYear.yearLabel,
      level: academicYear.level,
      isCurrent: academicYear.isCurrent,
      semesters: academicYear.semesters.map((s) => ({
        id: s.id,
        number: s.number,
        label: s.label,
        isActive: s.isActive,
      })),
    },
  };
}

export async function getSuggestedUniversities(): Promise<string[]> {
  const dbUniversities = await prisma.university.findMany({
    select: { name: true },
    take: 50,
  });
  const namesSet = new Set([...DEFAULT_UNIVERSITIES, ...dbUniversities.map((u) => u.name)]);
  return Array.from(namesSet);
}

export async function updateSemesterStatus(
  userId: string,
  semesterId: string,
  input: SemesterPatchInput
): Promise<SemesterDTO> {
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: { academicYear: true },
  });
  if (!semester || semester.academicYear.userId !== userId) {
    throw ApiError.notFound('Semestre introuvable ou accès refusé.');
  }

  const updated = await prisma.semester.update({
    where: { id: semesterId },
    data: { isActive: input.isActive },
  });

  return {
    id: updated.id,
    number: updated.number,
    label: updated.label,
    isActive: updated.isActive,
  };
}