import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';

const prisma = new PrismaClient();

export interface NoteTypeInput {
  name: string;
  weight: number;
}

const DEFAULT_NOTE_TYPES: NoteTypeInput[] = [
  { name: 'CC', weight: 30 },
  { name: 'TD', weight: 10 },
  { name: 'CM', weight: 60 },
];

/**
 * Assure la présence des types de notes par défaut (CC 30%, TD 10%, CM 60%)
 */
export async function ensureDefaultNoteTypes(userId: string) {
  const existing = await prisma.noteType.findMany({
    where: { userId, ecueId: null },
  });

  if (existing.length === 0) {
    await prisma.noteType.createMany({
      data: DEFAULT_NOTE_TYPES.map((t) => ({
        userId,
        ecueId: null,
        name: t.name,
        weight: t.weight,
      })),
    });
    return prisma.noteType.findMany({
      where: { userId, ecueId: null },
    });
  }

  return existing;
}

/**
 * Récupérer la configuration du barème pour un utilisateur
 */
export async function getGradeConfig(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const defaultTypes = await ensureDefaultNoteTypes(userId);
  const customTypes = await prisma.noteType.findMany({
    where: { userId, ecueId: { not: null } },
    include: { ecue: true },
  });

  return {
    mode: user?.gradeMode || 'weighted',
    defaultTypes,
    customTypes,
  };
}

/**
 * Mettre à jour la configuration du barème (mode, global ou par ECUE)
 */
export async function setGradeConfig(
  userId: string,
  ecueId?: string | null,
  types?: NoteTypeInput[],
  mode?: 'weighted' | 'simple'
) {
  if (mode && (mode === 'weighted' || mode === 'simple')) {
    await prisma.user.update({
      where: { id: userId },
      data: { gradeMode: mode },
    });
  }

  if (types && Array.isArray(types) && types.length > 0) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const currentMode = mode || user?.gradeMode || 'weighted';

    if (currentMode === 'weighted') {
      const sumWeight = types.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
      if (Math.abs(sumWeight - 100) > 1.0) {
        throw ApiError.badRequest(`La somme des coefficients doit être égale à 100% (±1%). Actuel : ${sumWeight}%`);
      }
    }

    const targetEcueId = ecueId || null;

    await prisma.$transaction(async (tx) => {
      await tx.noteType.deleteMany({
        where: {
          userId,
          ecueId: targetEcueId,
        },
      });

      await tx.noteType.createMany({
        data: types.map((t) => ({
          userId,
          ecueId: targetEcueId,
          name: t.name.trim(),
          weight: Number(t.weight) || 0,
        })),
      });
    });
  }

  return getGradeConfig(userId);
}

/**
 * Enregistrer / Upsert des notes d'une ECUE
 */
export async function saveGrades(
  userId: string,
  ecueId: string,
  notes: { noteTypeId: string; value: number | null }[]
) {
  if (!ecueId) throw ApiError.badRequest("L'ID de l'ECUE est requis.");
  if (!Array.isArray(notes)) throw ApiError.badRequest('Le tableau de notes est requis.');

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const item of notes) {
      const val = item.value === null || item.value === undefined || isNaN(item.value) ? null : Number(item.value);
      const note = await tx.note.upsert({
        where: {
          userId_ecueId_noteTypeId: {
            userId,
            ecueId,
            noteTypeId: item.noteTypeId,
          },
        },
        create: {
          userId,
          ecueId,
          noteTypeId: item.noteTypeId,
          value: val,
        },
        update: {
          value: val,
        },
      });
      results.push(note);
    }
    return results;
  });
}

/**
 * Calculer la moyenne d'une ECUE selon les formules officielles ou mode simple
 */
export function calculateEcueAverage(
  noteTypes: { id: string; name: string; weight: number }[],
  notes: { noteTypeId: string; value: number | null }[],
  mode: 'weighted' | 'simple' = 'weighted'
): { average: number | null; enteredWeightRatio: number } {
  if (mode === 'simple') {
    let sumValues = 0;
    let count = 0;

    for (const nt of noteTypes) {
      const userNote = notes.find((n) => n.noteTypeId === nt.id);
      if (userNote && userNote.value !== null && userNote.value !== undefined && !isNaN(userNote.value)) {
        sumValues += userNote.value;
        count++;
      }
    }

    if (count === 0) {
      return { average: null, enteredWeightRatio: 0 };
    }

    const rawAvg = sumValues / count;
    const roundedAvg = Math.round(rawAvg * 100) / 100;
    return { average: roundedAvg, enteredWeightRatio: count / (noteTypes.length || 1) };
  }

  // Mode pondéré
  let sumValueWeight = 0;
  let sumEnteredWeights = 0;

  for (const nt of noteTypes) {
    const userNote = notes.find((n) => n.noteTypeId === nt.id);
    if (userNote && userNote.value !== null && userNote.value !== undefined && !isNaN(userNote.value)) {
      sumValueWeight += userNote.value * nt.weight;
      sumEnteredWeights += nt.weight;
    }
  }

  if (sumEnteredWeights <= 0) {
    return { average: null, enteredWeightRatio: 0 };
  }

  // Moyenne renormalisée sur la somme des poids des notes saisies
  const rawAvg = sumValueWeight / sumEnteredWeights;
  const roundedAvg = Math.round(rawAvg * 100) / 100;
  return { average: roundedAvg, enteredWeightRatio: sumEnteredWeights / 100 };
}

/**
 * Obtenir l'ensemble des moyennes calculées (par ECUE, UE, Semestre, Année)
 */
export async function getAverages(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const gradeMode = (user?.gradeMode as 'weighted' | 'simple') || 'weighted';

  await ensureDefaultNoteTypes(userId);

  // 1. Récupérer l'arborescence complète de l'année courante
  const academicYear = await prisma.academicYear.findFirst({
    where: { userId, isCurrent: true },
    include: {
      semesters: {
        orderBy: { number: 'asc' },
        include: {
          ues: {
            include: {
              ecues: true,
            },
          },
        },
      },
    },
  });

  if (!academicYear) {
    return {
      mode: gradeMode,
      annualAverage: null,
      totalValidatedCredits: 0,
      totalCredits: 0,
      semesters: [],
    };
  }

  // 2. Récupérer tous les noteTypes et notes de l'utilisateur
  const allNoteTypes = await prisma.noteType.findMany({
    where: { userId },
  });

  const allNotes = await prisma.note.findMany({
    where: { userId },
  });

  const defaultNoteTypes = allNoteTypes.filter((nt) => nt.ecueId === null);

  let annualWeightedSum = 0;
  let annualCreditSum = 0;
  let totalValidatedCredits = 0;
  let totalCredits = 0;

  const semestersDTO = academicYear.semesters.map((sem) => {
    let semWeightedSum = 0;
    let semCreditSum = 0;
    let semTotalEcts = 0;

    const uesDTO = sem.ues.map((ue) => {
      let ueWeightedSum = 0;
      let ueCreditSum = 0;

      // Coef UE = Somme des coefs (ects) de ses ECUEs
      const calculatedUeCoef = ue.ecues.length > 0
        ? ue.ecues.reduce((acc, e) => acc + (e.ects && Number(e.ects) > 0 ? Number(e.ects) : 1), 0)
        : (ue.ects && Number(ue.ects) > 0 ? Number(ue.ects) : 0);

      const ecuesDTO = ue.ecues.map((ecue) => {
        // Types de notes spécifiques à l'ECUE ou par défaut
        const specificTypes = allNoteTypes.filter((nt) => nt.ecueId === ecue.id);
        const activeTypes = specificTypes.length > 0 ? specificTypes : defaultNoteTypes;

        const ecueNotes = allNotes.filter((n) => n.ecueId === ecue.id);
        const { average } = calculateEcueAverage(activeTypes, ecueNotes, gradeMode);

        const hasValidEcts = ecue.ects !== null && ecue.ects !== undefined && Number(ecue.ects) > 0;
        const ecueCoef = hasValidEcts ? Number(ecue.ects) : 1;
        const noCoef = !hasValidEcts;

        if (average !== null) {
          ueWeightedSum += average * ecueCoef;
          ueCreditSum += ecueCoef;

          if (average >= 10.0) {
            totalValidatedCredits += ecueCoef;
          }
        }
        totalCredits += ecueCoef;

        const notesDetail = activeTypes.map((nt) => {
          const foundNote = ecueNotes.find((n) => n.noteTypeId === nt.id);
          return {
            noteTypeId: nt.id,
            noteTypeName: nt.name,
            weight: nt.weight,
            value: foundNote?.value !== undefined ? foundNote.value : null,
          };
        });

        return {
          ecueId: ecue.id,
          code: ecue.code,
          title: ecue.title,
          ects: ecue.ects,
          coef: ecueCoef,
          noCoef,
          average,
          notes: notesDetail,
        };
      });

      let ueAverage: number | null = null;
      if (ueCreditSum > 0) {
        ueAverage = Math.round((ueWeightedSum / ueCreditSum) * 100) / 100;
        semWeightedSum += ueAverage * calculatedUeCoef;
        semCreditSum += calculatedUeCoef;
      }
      semTotalEcts += calculatedUeCoef;

      return {
        ueId: ue.id,
        code: ue.code,
        title: ue.title,
        ects: calculatedUeCoef,
        coefUE: calculatedUeCoef,
        average: ueAverage,
        ecues: ecuesDTO,
      };
    });

    let semesterAverage: number | null = null;
    if (semCreditSum > 0) {
      semesterAverage = Math.round((semWeightedSum / semCreditSum) * 100) / 100;
      annualWeightedSum += semesterAverage * semTotalEcts;
      annualCreditSum += semTotalEcts;
    }

    return {
      semesterId: sem.id,
      semesterNumber: sem.number,
      semesterLabel: sem.label,
      average: semesterAverage,
      credits: semTotalEcts,
      ues: uesDTO,
    };
  });

  let annualAverage: number | null = null;
  if (annualCreditSum > 0) {
    annualAverage = Math.round((annualWeightedSum / annualCreditSum) * 100) / 100;
  }

  return {
    mode: gradeMode,
    annualAverage,
    totalValidatedCredits: Math.round(totalValidatedCredits * 10) / 10,
    totalCredits: Math.round(totalCredits * 10) / 10,
    semesters: semestersDTO,
  };
}
