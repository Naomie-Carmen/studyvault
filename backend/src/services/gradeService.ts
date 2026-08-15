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
  const defaultTypes = await ensureDefaultNoteTypes(userId);
  const customTypes = await prisma.noteType.findMany({
    where: { userId, ecueId: { not: null } },
    include: { ecue: true },
  });

  return {
    defaultTypes,
    customTypes,
  };
}

/**
 * Mettre à jour la configuration du barème (global ou par ECUE)
 */
export async function setGradeConfig(userId: string, ecueId: string | null | undefined, types: NoteTypeInput[]) {
  if (!Array.isArray(types) || types.length === 0) {
    throw ApiError.badRequest('Au moins un type de note est requis.');
  }

  const sumWeight = types.reduce((acc, t) => acc + (Number(t.weight) || 0), 0);
  if (Math.abs(sumWeight - 100) > 1.0) {
    throw ApiError.badRequest(`La somme des coefficients doit être égale à 100% (±1%). Actuel : ${sumWeight}%`);
  }

  const targetEcueId = ecueId || null;

  return prisma.$transaction(async (tx) => {
    // Supprimer la config existante sur ce scope
    await tx.noteType.deleteMany({
      where: {
        userId,
        ecueId: targetEcueId,
      },
    });

    // Créer les nouveaux types de notes
    await tx.noteType.createMany({
      data: types.map((t) => ({
        userId,
        ecueId: targetEcueId,
        name: t.name.trim(),
        weight: Number(t.weight),
      })),
    });

    return tx.noteType.findMany({
      where: {
        userId,
        ecueId: targetEcueId,
      },
    });
  });
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
 * Calculer la moyenne d'une ECUE selon les formules officielles
 */
export function calculateEcueAverage(
  noteTypes: { id: string; name: string; weight: number }[],
  notes: { noteTypeId: string; value: number | null }[]
): { average: number | null; enteredWeightRatio: number } {
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
      let ueEcts = ue.ects || 0;

      // Si ECTS non spécifié sur l'UE, on somme l'ECTS estimé
      if (!ueEcts && ue.ecues.length > 0) {
        ueEcts = ue.ecues.length * 3;
      }

      const ecuesDTO = ue.ecues.map((ecue) => {
        // Types de notes spécifiques à l'ECUE ou par défaut
        const specificTypes = allNoteTypes.filter((nt) => nt.ecueId === ecue.id);
        const activeTypes = specificTypes.length > 0 ? specificTypes : defaultNoteTypes;

        const ecueNotes = allNotes.filter((n) => n.ecueId === ecue.id);
        const { average } = calculateEcueAverage(activeTypes, ecueNotes);

        const ecueEcts = ueEcts > 0 && ue.ecues.length > 0 ? ueEcts / ue.ecues.length : 3;

        if (average !== null) {
          ueWeightedSum += average * ecueEcts;
          ueCreditSum += ecueEcts;

          if (average >= 10.0) {
            totalValidatedCredits += ecueEcts;
          }
        }
        totalCredits += ecueEcts;

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
          average,
          notes: notesDetail,
        };
      });

      let ueAverage: number | null = null;
      if (ueCreditSum > 0) {
        ueAverage = Math.round((ueWeightedSum / ueCreditSum) * 100) / 100;
        semWeightedSum += ueAverage * ueEcts;
        semCreditSum += ueEcts;
      }
      semTotalEcts += ueEcts;

      return {
        ueId: ue.id,
        code: ue.code,
        title: ue.title,
        ects: ue.ects,
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
    annualAverage,
    totalValidatedCredits: Math.round(totalValidatedCredits * 10) / 10,
    totalCredits: Math.round(totalCredits * 10) / 10,
    semesters: semestersDTO,
  };
}
