import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { UEInput, ECUEInput, SubjectInput, StructureImportItem } from '../utils/validators';
import { AcademicStructureTreeDTO } from '../types/structure';

const prisma = new PrismaClient();

function normalize(s: string): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}


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
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            include: {
              ecues: {
                orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
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

export async function importStructureBatch(userId: string, items: StructureImportItem[]) {
  const academicYear = await prisma.academicYear.findFirst({
    where: { userId, isCurrent: true },
  });

  if (!academicYear) {
    throw ApiError.badRequest("Configurez d'abord votre profil universitaire.");
  }

  const result = await prisma.$transaction(async (tx) => {
    let createdUEs = 0;
    let skippedUEs = 0;
    let createdECUEs = 0;
    let skippedECUEs = 0;
    let createdSubjects = 0;
    let skippedSubjects = 0;

    const semesterMap = new Map<number, any>();
    const ueMap = new Map<string, { ue: any; isNew: boolean }>();
    const ecueMap = new Map<string, { ecue: any; isNew: boolean }>();

    const distinctSemesterNumbers = Array.from(new Set(items.map(it => it.semesterNumber || 1)));
    for (const semNum of distinctSemesterNumbers) {
      let sem = await tx.semester.findFirst({
        where: {
          academicYearId: academicYear.id,
          number: semNum,
        },
      });
      if (!sem) {
        sem = await tx.semester.create({
          data: {
            academicYearId: academicYear.id,
            number: semNum,
            label: `Semestre ${semNum}`,
            isActive: true,
          },
        });
      }
      semesterMap.set(semNum, sem);
    }

    for (const item of items) {
      const semNum = item.semesterNumber || 1;
      const sem = semesterMap.get(semNum);
      if (!sem) continue;

      const normUeTitle = normalize(item.ueTitle);
      const normUeCode = item.ueCode ? normalize(item.ueCode) : '';
      const ueKey = normUeCode || normUeTitle;
      const ueMapKey = `${sem.id}:${ueKey}`;

      let ueEntry = ueMap.get(ueMapKey);

      if (!ueEntry) {
        const existingUEs = await tx.uE.findMany({
          where: { semesterId: sem.id },
        });

        const foundUE = existingUEs.find(u => {
          if (normUeCode && u.code) {
            return normalize(u.code) === normUeCode;
          }
          return normalize(u.title) === normUeTitle;
        });

        if (foundUE) {
          ueEntry = { ue: foundUE, isNew: false };
          skippedUEs++;
        } else {
          const newUE = await tx.uE.create({
            data: {
              semesterId: sem.id,
              title: item.ueTitle,
              code: item.ueCode || null,
              ects: item.ects || null,
            },
          });
          ueEntry = { ue: newUE, isNew: true };
          createdUEs++;
        }
        ueMap.set(ueMapKey, ueEntry);
      }

      const ue = ueEntry.ue;

      let ecueObj: any = null;
      if (item.ecueTitle && item.ecueTitle.trim().length >= 2) {
        const normEcueTitle = normalize(item.ecueTitle);
        const normEcueCode = item.ecueCode ? normalize(item.ecueCode) : '';
        const ecueKey = normEcueCode || normEcueTitle;
        const ecueMapKey = `${ue.id}:${ecueKey}`;

        let ecueEntry = ecueMap.get(ecueMapKey);

        if (!ecueEntry) {
          const existingECUEs = await tx.eCUE.findMany({
            where: { ueId: ue.id },
          });

          const foundECUE = existingECUEs.find(e => {
            if (normEcueCode && e.code) {
              return normalize(e.code) === normEcueCode;
            }
            return normalize(e.title) === normEcueTitle;
          });

          if (foundECUE) {
            ecueEntry = { ecue: foundECUE, isNew: false };
            skippedECUEs++;
          } else {
            const newECUE = await tx.eCUE.create({
              data: {
                ueId: ue.id,
                title: item.ecueTitle,
                code: item.ecueCode || null,
              },
            });
            ecueEntry = { ecue: newECUE, isNew: true };
            createdECUEs++;
          }
          ecueMap.set(ecueMapKey, ecueEntry);
        }
        ecueObj = ecueEntry.ecue;
      }

      if (item.subjectName && item.subjectName.trim().length >= 2) {
        const normSubName = normalize(item.subjectName);

        const existingSubjects = await tx.subject.findMany({
          where: ecueObj
            ? { ecueId: ecueObj.id }
            : { ueId: ue.id, ecueId: null },
        });

        const foundSub = existingSubjects.find(s => normalize(s.name) === normSubName);

        if (foundSub) {
          skippedSubjects++;
        } else {
          await tx.subject.create({
            data: {
              name: item.subjectName.trim(),
              instructor: item.instructor || null,
              color: '#6366f1',
              ueId: ecueObj ? null : ue.id,
              ecueId: ecueObj ? ecueObj.id : null,
            },
          });
          createdSubjects++;
        }
      }
    }

    return {
      created: { ues: createdUEs, ecues: createdECUEs, subjects: createdSubjects },
      skipped: { ues: skippedUEs, ecues: skippedECUEs, subjects: skippedSubjects },
      totalRows: items.length,
    };
  });

  return result;
}

export async function bulkImportRows(userId: string, rawRows: any[]) {
  let academicYear = await prisma.academicYear.findFirst({
    where: { userId, isCurrent: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        userId,
        yearLabel: '2025-2026',
        level: 'Master',
        isCurrent: true,
      },
    });
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdSemestres = new Set<string>();
    const createdUEs = new Set<string>();
    const createdECUEs = new Set<string>();

    const semesterMap = new Map<number, any>();
    const ueMap = new Map<string, any>();
    const ecueMap = new Map<string, any>();

    // Pré-chargement des semestres, UEs et ECUEs existants en mémoire
    const existingSemesters = await tx.semester.findMany({
      where: { academicYearId: academicYear.id },
      include: { ues: { include: { ecues: true } } },
    });

    for (const sem of existingSemesters) {
      semesterMap.set(sem.number, sem);
      for (const u of sem.ues) {
        const uKey = `${sem.id}:${normalize(u.code || u.title)}`;
        ueMap.set(uKey, u);
        for (const e of u.ecues) {
          const eKey = `${u.id}:${normalize(e.code || e.title)}`;
          ecueMap.set(eKey, e);
        }
      }
    }

    let lastSemNum = 1;
    let lastUECode = '';
    let lastUETitle = '';

    for (let r = 0; r < rawRows.length; r++) {
      const row = rawRows[r];
      if (!row) continue;

      let semVal = '';
      let codeUE = '';
      let intituleUE = '';
      let codeECUE = '';
      let intituleECUE = '';
      let ectsStr = '';
      let enseignant = '';

      if (Array.isArray(row)) {
        semVal = String(row[0] || '').trim();
        codeUE = String(row[1] || '').trim();
        intituleUE = String(row[2] || '').trim();
        codeECUE = String(row[3] || '').trim();
        intituleECUE = String(row[4] || '').trim();
        ectsStr = String(row[5] || '').trim();
        enseignant = String(row[6] || '').trim();
      } else if (typeof row === 'object') {
        semVal = String(row.semestre || row.semesterNumber || row.Semestre || '').trim();
        codeUE = String(row.codeUE || row.ueCode || row.CodeUE || '').trim();
        intituleUE = String(row.intituleUE || row.ueTitle || row.IntituleUE || '').trim();
        codeECUE = String(row.codeECUE || row.ecueCode || row.CodeECUE || '').trim();
        intituleECUE = String(row.intituleECUE || row.ecueTitle || row.IntituleECUE || row.subjectName || '').trim();
        ectsStr = String(row.ects || row.ECTS || '').trim();
        enseignant = String(row.enseignant || row.instructor || row.Enseignant || '').trim();
      }

      // Ignorer l'en-tête si présent dans rawRows
      const lowerJoin = `${semVal} ${codeUE} ${intituleUE} ${codeECUE} ${intituleECUE}`.toLowerCase();
      if (lowerJoin.includes('semestre') && lowerJoin.includes('code ue') && lowerJoin.includes('intitulé ue')) {
        continue;
      }
      if (!semVal && !codeUE && !intituleUE && !codeECUE && !intituleECUE) {
        continue;
      }

      // 1. Diction de Semestre
      let semNum = lastSemNum;
      if (semVal) {
        const parsed = parseInt(semVal.replace(/\D/g, ''), 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 12) {
          semNum = parsed;
          lastSemNum = semNum;
        }
      }

      let semObj = semesterMap.get(semNum);
      if (!semObj) {
        semObj = await tx.semester.create({
          data: {
            academicYearId: academicYear.id,
            number: semNum,
            label: `Semestre ${semNum}`,
            isActive: true,
          },
        });
        createdSemestres.add(semObj.id);
        semesterMap.set(semNum, semObj);
      }

      // 2. UE (Unité d'Enseignement)
      if (!codeUE && !intituleUE) {
        codeUE = lastUECode;
        intituleUE = lastUETitle;
      } else {
        lastUECode = codeUE;
        lastUETitle = intituleUE;
      }

      if (!intituleUE && codeUE) intituleUE = codeUE;
      if (!codeUE && intituleUE) codeUE = intituleUE;

      if (!intituleUE) continue;

      const ueKey = `${semObj.id}:${normalize(codeUE || intituleUE)}`;
      let ueObj = ueMap.get(ueKey);

      if (!ueObj) {
        const parsedEcts = parseFloat(ectsStr.replace(',', '.'));
        const ectsVal = !isNaN(parsedEcts) && parsedEcts > 0 ? parsedEcts : null;

        ueObj = await tx.uE.create({
          data: {
            semesterId: semObj.id,
            title: intituleUE,
            code: codeUE || null,
            ects: ectsVal,
          },
        });
        createdUEs.add(ueObj.id);
        ueMap.set(ueKey, ueObj);
      }

      // 3. ECUE & Matière
      const finalEcueTitle = intituleECUE || codeECUE;
      if (finalEcueTitle && finalEcueTitle.trim().length >= 2) {
        const ecueKey = `${ueObj.id}:${normalize(codeECUE || finalEcueTitle)}`;
        let ecueObj = ecueMap.get(ecueKey);

        if (!ecueObj) {
          ecueObj = await tx.eCUE.create({
            data: {
              ueId: ueObj.id,
              title: finalEcueTitle,
              code: codeECUE || null,
            },
          });
          createdECUEs.add(ecueObj.id);
          ecueMap.set(ecueKey, ecueObj);

          await tx.subject.create({
            data: {
              name: finalEcueTitle.trim(),
              instructor: enseignant || null,
              color: '#6366f1',
              ecueId: ecueObj.id,
              ueId: null,
            },
          });
        }
      }
    }

    return {
      semestres: createdSemestres.size > 0 ? createdSemestres.size : semesterMap.size,
      ues: createdUEs.size > 0 ? createdUEs.size : ueMap.size,
      ecues: createdECUEs.size > 0 ? createdECUEs.size : ecueMap.size,
    };
  }, { timeout: 30000 });

  return result;
}

export interface ReorderInput {
  type: 'ue' | 'ecue';
  id: string;
  newParentId?: string;
  newIndex: number;
}

export async function reorderStructureItem(userId: string, input: ReorderInput) {
  const { type, id, newParentId, newIndex } = input;

  if (type === 'ue') {
    await verifyUEOwnership(userId, id);
    const targetUe = await prisma.uE.findUnique({
      where: { id },
      include: { semester: { include: { academicYear: true } } },
    });
    if (!targetUe) throw ApiError.notFound('UE introuvable.');

    const targetSemesterId = newParentId || targetUe.semesterId;
    await verifySemesterOwnership(userId, targetSemesterId);

    const targetUes = await prisma.uE.findMany({
      where: { semesterId: targetSemesterId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const filtered = targetUes.filter((u) => u.id !== id);
    const clampedIndex = Math.max(0, Math.min(newIndex, filtered.length));
    filtered.splice(clampedIndex, 0, targetUe);

    return prisma.$transaction(async (tx) => {
      if (targetSemesterId !== targetUe.semesterId) {
        await tx.uE.update({
          where: { id },
          data: { semesterId: targetSemesterId },
        });

        const sourceUes = await tx.uE.findMany({
          where: { semesterId: targetUe.semesterId },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
        for (let i = 0; i < sourceUes.length; i++) {
          await tx.uE.update({
            where: { id: sourceUes[i].id },
            data: { order: i },
          });
        }
      }

      for (let i = 0; i < filtered.length; i++) {
        await tx.uE.update({
          where: { id: filtered[i].id },
          data: { order: i, semesterId: targetSemesterId },
        });
      }

      return { success: true };
    });
  }

  if (type === 'ecue') {
    await verifyECUEOwnership(userId, id);
    const targetEcue = await prisma.eCUE.findUnique({
      where: { id },
      include: { ue: true },
    });
    if (!targetEcue) throw ApiError.notFound('ECUE introuvable.');

    const targetUeId = newParentId || targetEcue.ueId;
    await verifyUEOwnership(userId, targetUeId);

    const targetEcues = await prisma.eCUE.findMany({
      where: { ueId: targetUeId },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });

    const filtered = targetEcues.filter((e) => e.id !== id);
    const clampedIndex = Math.max(0, Math.min(newIndex, filtered.length));
    filtered.splice(clampedIndex, 0, targetEcue);

    return prisma.$transaction(async (tx) => {
      if (targetUeId !== targetEcue.ueId) {
        await tx.eCUE.update({
          where: { id },
          data: { ueId: targetUeId },
        });

        const sourceEcues = await tx.eCUE.findMany({
          where: { ueId: targetEcue.ueId },
          orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
        });
        for (let i = 0; i < sourceEcues.length; i++) {
          await tx.eCUE.update({
            where: { id: sourceEcues[i].id },
            data: { order: i },
          });
        }
      }

      for (let i = 0; i < filtered.length; i++) {
        await tx.eCUE.update({
          where: { id: filtered[i].id },
          data: { order: i, ueId: targetUeId },
        });
      }

      return { success: true };
    });
  }

  throw ApiError.badRequest('Type invalide (ue ou ecue).');
}

export async function deleteAllStructure(userId: string) {
  let academicYear = await prisma.academicYear.findFirst({
    where: { userId, isCurrent: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        userId,
        yearLabel: '2025-2026',
        level: 'L1',
        isCurrent: true,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.semester.deleteMany({
      where: { academicYearId: academicYear.id },
    });

    await tx.semester.createMany({
      data: [
        { academicYearId: academicYear.id, number: 1, label: 'Semestre 1' },
        { academicYearId: academicYear.id, number: 2, label: 'Semestre 2' },
      ],
    });
  });

  console.log(`[DELETE ALL] User ${userId} deleted all academic structure and recreated default S1 & S2`);
  return { message: 'Arborescence réinitialisée. Importez votre maquette ou ajoutez vos UE manuellement.' };
}

export async function restoreStructure(userId: string, structure: any) {
  if (!structure || !Array.isArray(structure.semesters)) {
    throw ApiError.badRequest('Structure invalide pour la restauration.');
  }

  let academicYear = await prisma.academicYear.findFirst({
    where: { userId, isCurrent: true },
  });

  if (!academicYear) {
    academicYear = await prisma.academicYear.create({
      data: {
        userId,
        yearLabel: '2025-2026',
        level: 'L1',
        isCurrent: true,
      },
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.semester.deleteMany({
      where: { academicYearId: academicYear.id },
    });

    for (let sIdx = 0; sIdx < structure.semesters.length; sIdx++) {
      const sem = structure.semesters[sIdx];
      const createdSem = await tx.semester.create({
        data: {
          academicYearId: academicYear.id,
          number: sem.number ?? (sIdx + 1),
          label: sem.name || sem.label || `Semestre ${sIdx + 1}`,
        },
      });

      const ues = Array.isArray(sem.ues) ? sem.ues : [];
      for (let uIdx = 0; uIdx < ues.length; uIdx++) {
        const ue = ues[uIdx];
        const createdUe = await tx.uE.create({
          data: {
            semesterId: createdSem.id,
            title: ue.title,
            code: ue.code || null,
            ects: ue.ects ? Number(ue.ects) : null,
            order: ue.order ?? uIdx,
          },
        });

        const ecues = Array.isArray(ue.ecues) ? ue.ecues : [];
        for (let eIdx = 0; eIdx < ecues.length; eIdx++) {
          const ecue = ecues[eIdx];
          const createdEcue = await tx.eCUE.create({
            data: {
              ueId: createdUe.id,
              title: ecue.title,
              code: ecue.code || null,
              order: ecue.order ?? eIdx,
            },
          });

          const subjects = Array.isArray(ecue.subjects) ? ecue.subjects : [];
          if (subjects.length > 0) {
            for (const sub of subjects) {
              await tx.subject.create({
                data: {
                  name: sub.name,
                  instructor: sub.instructor || null,
                  color: sub.color || '#6366f1',
                  ecueId: createdEcue.id,
                  ueId: null,
                },
              });
            }
          } else {
            await tx.subject.create({
              data: {
                name: ecue.title,
                instructor: null,
                color: '#6366f1',
                ecueId: createdEcue.id,
                ueId: null,
              },
            });
          }
        }

        const directSubjects = Array.isArray(ue.directSubjects) ? ue.directSubjects : [];
        for (const sub of directSubjects) {
          await tx.subject.create({
            data: {
              name: sub.name,
              instructor: sub.instructor || null,
              color: sub.color || '#6366f1',
              ecueId: null,
              ueId: createdUe.id,
            },
          });
        }
      }
    }
  }, { timeout: 30000 });

  console.log(`[RESTORE] User ${userId} restored academic structure snapshot`);
  return { message: 'Arborescence restaurée avec succès.' };
}

