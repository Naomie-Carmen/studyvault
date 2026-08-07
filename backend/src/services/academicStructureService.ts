import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { UEInput, ECUEInput, SubjectInput } from '../utils/validators';
import { AcademicStructureTreeDTO } from '../types/structure';

const prisma = new PrismaClient();

// Helper to check user ownership of a semester
async function verifySemesterOwnership(userId: string, semesterId: string): Promise<void> {
  const semester = await prisma.semester.findUnique({
    where: { id: semesterId },
    include: { academicYear: true },
  });

  if (!semester || semester.academicYear.userId !== userId) {
    throw ApiError.notFound('Semestre introuvable ou accès refusé.');
  }
}

// Helper to check user ownership of a UE
async function verifyUEOwnership(userId: string, ueId: string): Promise<void> {
  const ue = await prisma.uE.findUnique({
    where: { id: ueId },
    include: { semester: { include: { academicYear: true } } },
  });

  if (!ue || ue.semester.academicYear.userId !== userId) {
    throw ApiError.notFound('Unité d\'Enseignement (UE) introuvable ou accès refusé.');
  }
}

// Helper to check user ownership of an ECUE
async function verifyECUEOwnership(userId: string, ecueId: string): Promise<void> {
  const ecue = await prisma.eCUE.findUnique({
    where: { id: ecueId },
    include: { ue: { include: { semester: { include: { academicYear: true } } } } },
  });

  if (!ecue || ecue.ue.semester.academicYear.userId !== userId) {
    throw ApiError.notFound('ECUE introuvable ou accès refusé.');
  }
}

// Helper to check user ownership of a Subject
async function verifySubjectOwnership(userId: string, subjectId: string): Promise<void> {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    include: {
      ue: { include: { semester: { include: { academicYear: true } } } },
      ecue: { include: { ue: { include: { semester: { include: { academicYear: true } } } } } },
    },
  });

  if (!subject) {
    throw ApiError.notFound('Matière introuvable.');
  }

  const ownerId =
    subject.ue?.semester.academicYear.userId ||
    subject.ecue?.ue.semester.academicYear.userId;

  if (ownerId !== userId) {
    throw ApiError.notFound('Matière introuvable ou accès refusé.');
  }
}

export async function getFullStructure(userId: string): Promise<AcademicStructureTreeDTO> {
  const academicYear = await prisma.academicYear.findFirst({
    where: { userId, isCurrent: true },
    include: {
      semesters: {
        orderBy: { number: 'asc' },
        include: {
          ues: {
            include: {
              ecues: {
                include: {
                  subjects: true,
                },
              },
              subjects: {
                where: { ecueId: null },
              },
            },
          },
        },
      },
    },
  });

  if (!academicYear) {
    return {
      academicYearLabel: '',
      level: '',
      semesters: [],
    };
  }

  return {
    academicYearLabel: academicYear.yearLabel,
    level: academicYear.level,
    semesters: academicYear.semesters.map((sem) => ({
      id: sem.id,
      number: sem.number,
      label: sem.label,
      isActive: sem.isActive,
      ues: sem.ues.map((ue) => ({
        id: ue.id,
        semesterId: ue.semesterId,
        code: ue.code,
        title: ue.title,
        ects: ue.ects,
        ecues: ue.ecues.map((ecue) => ({
          id: ecue.id,
          ueId: ecue.ueId,
          code: ecue.code,
          title: ecue.title,
          subjects: ecue.subjects.map((sub) => ({
            id: sub.id,
            ecueId: sub.ecueId,
            name: sub.name,
            instructor: sub.instructor,
            color: sub.color,
          })),
        })),
        directSubjects: ue.subjects.map((sub) => ({
          id: sub.id,
          ueId: sub.ueId,
          name: sub.name,
          instructor: sub.instructor,
          color: sub.color,
        })),
      })),
    })),
  };
}

export async function createUE(userId: string, input: UEInput) {
  await verifySemesterOwnership(userId, input.semesterId);

  return prisma.uE.create({
    data: {
      semesterId: input.semesterId,
      title: input.title,
      code: input.code || null,
      ects: input.ects || null,
    },
  });
}

export async function updateUE(userId: string, ueId: string, input: Partial<UEInput>) {
  await verifyUEOwnership(userId, ueId);

  return prisma.uE.update({
    where: { id: ueId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.ects !== undefined ? { ects: input.ects } : {}),
    },
  });
}

export async function deleteUE(userId: string, ueId: string) {
  await verifyUEOwnership(userId, ueId);
  return prisma.uE.delete({ where: { id: ueId } });
}

export async function createECUE(userId: string, input: ECUEInput) {
  await verifyUEOwnership(userId, input.ueId);

  return prisma.eCUE.create({
    data: {
      ueId: input.ueId,
      title: input.title,
      code: input.code || null,
    },
  });
}

export async function updateECUE(userId: string, ecueId: string, input: Partial<ECUEInput>) {
  await verifyECUEOwnership(userId, ecueId);

  return prisma.eCUE.update({
    where: { id: ecueId },
    data: {
      ...(input.title ? { title: input.title } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
    },
  });
}

export async function deleteECUE(userId: string, ecueId: string) {
  await verifyECUEOwnership(userId, ecueId);
  return prisma.eCUE.delete({ where: { id: ecueId } });
}

export async function createSubject(userId: string, input: SubjectInput) {
  if (input.ueId) {
    await verifyUEOwnership(userId, input.ueId);
  } else if (input.ecueId) {
    await verifyECUEOwnership(userId, input.ecueId);
  }

  return prisma.subject.create({
    data: {
      name: input.name,
      instructor: input.instructor || null,
      color: input.color || '#6366f1',
      ueId: input.ueId || null,
      ecueId: input.ecueId || null,
    },
  });
}

export async function updateSubject(userId: string, subjectId: string, input: Partial<SubjectInput>) {
  await verifySubjectOwnership(userId, subjectId);

  return prisma.subject.update({
    where: { id: subjectId },
    data: {
      ...(input.name ? { name: input.name } : {}),
      ...(input.instructor !== undefined ? { instructor: input.instructor } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    },
  });
}

export async function deleteSubject(userId: string, subjectId: string) {
  await verifySubjectOwnership(userId, subjectId);
  return prisma.subject.delete({ where: { id: subjectId } });
}
