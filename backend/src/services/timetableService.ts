import { PrismaClient, Prisma } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { TimetableSessionDTO, TimetableImportDTO, TimetableStatsDTO } from '../types/timetable';
import { TimetableSessionInput } from '../utils/validators';

const prisma = new PrismaClient();

function calculateDurationHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export async function createSession(
  userId: string,
  input: TimetableSessionInput
): Promise<TimetableSessionDTO> {
  let targetSubjectId = input.subjectId;
  let targetEcueId = input.ecueId || null;

  // 1. Try finding Subject directly
  let subject = await prisma.subject.findUnique({
    where: { id: targetSubjectId },
  });

  // 2. If subject not found, targetSubjectId or input.ecueId might be an ECUE id!
  if (!subject) {
    const searchEcueId = input.ecueId || input.subjectId;
    if (searchEcueId) {
      const ecue = await prisma.eCUE.findUnique({
        where: { id: searchEcueId },
        include: { subjects: true },
      });

      if (ecue) {
        targetEcueId = ecue.id;

        if (ecue.subjects && ecue.subjects.length > 0) {
          subject = ecue.subjects[0];
          targetSubjectId = subject.id;
        } else {
          // Create a mirror Subject for this ECUE automatically
          subject = await prisma.subject.create({
            data: {
              name: ecue.title,
              ecueId: ecue.id,
              instructor: ecue.instructor,
              color: '#6366f1',
            },
          });
          targetSubjectId = subject.id;
        }
      }
    }
  }

  if (!subject) {
    throw ApiError.notFound('Matière ou ECUE introuvable.');
  }

  // Check for conflict (overlapping session on same day)
  const overlapping = await prisma.timetableSession.findFirst({
    where: {
      userId,
      dayOfWeek: input.dayOfWeek,
      startTime: { lt: input.endTime },
      endTime: { gt: input.startTime },
    },
  });

  const session = await prisma.timetableSession.create({
    data: {
      userId,
      subjectId: targetSubjectId,
      ecueId: targetEcueId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room || null,
      sessionType: input.sessionType,
      recurrence: input.recurrence,
      color: input.color || subject.color || '#6366f1',
      notes: input.notes || null,
    },
    include: {
      subject: { select: { id: true, name: true, color: true } },
      ecue: { select: { id: true, title: true, code: true, instructor: true } },
    },
  });

  return {
    ...(session as unknown as TimetableSessionDTO),
    hasConflict: !!overlapping,
  };
}

export async function getSessions(
  userId: string,
  filters?: { dayOfWeek?: number; subjectId?: string; sessionType?: string }
): Promise<TimetableSessionDTO[]> {
  const where: Prisma.TimetableSessionWhereInput = { userId };

  if (filters?.dayOfWeek !== undefined && !isNaN(filters.dayOfWeek)) {
    where.dayOfWeek = filters.dayOfWeek;
  }
  if (filters?.subjectId) {
    where.subjectId = filters.subjectId;
  }
  if (filters?.sessionType) {
    where.sessionType = filters.sessionType;
  }

  const sessions = await prisma.timetableSession.findMany({
    where,
    include: {
      subject: { select: { id: true, name: true, color: true } },
      ecue: { select: { id: true, title: true, code: true, instructor: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  // Calculate conflict flags for each session
  return sessions.map((s, index) => {
    const hasConflict = sessions.some(
      (other, oIndex) =>
        index !== oIndex &&
        other.dayOfWeek === s.dayOfWeek &&
        other.startTime < s.endTime &&
        other.endTime > s.startTime
    );
    return {
      ...(s as unknown as TimetableSessionDTO),
      hasConflict,
    };
  });
}

export async function getWeekSessions(userId: string): Promise<Record<number, TimetableSessionDTO[]>> {
  const allSessions = await getSessions(userId);
  const grouped: Record<number, TimetableSessionDTO[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };

  allSessions.forEach((s) => {
    if (s.dayOfWeek in grouped) {
      grouped[s.dayOfWeek].push(s);
    }
  });

  return grouped;
}

export async function getTodaySessions(userId: string): Promise<TimetableSessionDTO[]> {
  // Convert JS Sunday=0 to Monday=0 format
  const jsDay = new Date().getDay();
  const todayDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

  return getSessions(userId, { dayOfWeek: todayDayOfWeek });
}

export async function getUpcomingSessions(userId: string): Promise<TimetableSessionDTO[]> {
  const allSessions = await getSessions(userId);
  const jsDay = new Date().getDay();
  const todayDayOfWeek = jsDay === 0 ? 6 : jsDay - 1;

  // Filter sessions starting from today
  return allSessions.filter((s) => s.dayOfWeek >= todayDayOfWeek).slice(0, 5);
}

export async function updateSession(
  userId: string,
  sessionId: string,
  input: Partial<TimetableSessionInput>
): Promise<TimetableSessionDTO> {
  const existing = await prisma.timetableSession.findUnique({
    where: { id: sessionId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Séance introuvable ou accès refusé.');
  }

  const updated = await prisma.timetableSession.update({
    where: { id: sessionId },
    data: {
      ...(input.subjectId ? { subjectId: input.subjectId } : {}),
      ...(input.dayOfWeek !== undefined ? { dayOfWeek: input.dayOfWeek } : {}),
      ...(input.startTime ? { startTime: input.startTime } : {}),
      ...(input.endTime ? { endTime: input.endTime } : {}),
      ...(input.room !== undefined ? { room: input.room } : {}),
      ...(input.sessionType ? { sessionType: input.sessionType } : {}),
      ...(input.recurrence ? { recurrence: input.recurrence } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
    include: {
      subject: { select: { id: true, name: true, color: true } },
    },
  });

  return updated as unknown as TimetableSessionDTO;
}

export async function deleteSession(userId: string, sessionId: string): Promise<void> {
  const existing = await prisma.timetableSession.findUnique({
    where: { id: sessionId },
  });

  if (!existing || existing.userId !== userId) {
    throw ApiError.notFound('Séance introuvable ou accès refusé.');
  }

  await prisma.timetableSession.delete({
    where: { id: sessionId },
  });
}

export async function getTimetableStats(userId: string): Promise<TimetableStatsDTO> {
  const sessions = await getSessions(userId);

  let totalHoursPerWeek = 0;
  const hoursByType = { CM: 0, TD: 0, TP: 0, EXAM: 0, OTHER: 0 };
  const hoursPerDay: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  sessions.forEach((s) => {
    const dur = calculateDurationHours(s.startTime, s.endTime);
    totalHoursPerWeek += dur;

    if (s.sessionType in hoursByType) {
      hoursByType[s.sessionType as keyof typeof hoursByType] += dur;
    } else {
      hoursByType.OTHER += dur;
    }

    hoursPerDay[s.dayOfWeek] = (hoursPerDay[s.dayOfWeek] || 0) + dur;
  });

  const dayNames = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  let busiestDayIndex = 0;
  let maxHours = 0;

  Object.entries(hoursPerDay).forEach(([dayStr, hrs]) => {
    if (hrs > maxHours) {
      maxHours = hrs;
      busiestDayIndex = Number(dayStr);
    }
  });

  return {
    totalHoursPerWeek: Number(totalHoursPerWeek.toFixed(1)),
    hoursByType,
    busiestDay: maxHours > 0 ? { dayOfWeek: busiestDayIndex, dayName: dayNames[busiestDayIndex], totalHours: Number(maxHours.toFixed(1)) } : null,
  };
}

export async function saveTimetableImport(
  userId: string,
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<TimetableImportDTO> {
  return prisma.timetableImport.create({
    data: {
      userId,
      filePath,
      fileName,
      mimeType,
      status: 'completed',
    },
  });
}

export async function getTimetableImports(userId: string): Promise<TimetableImportDTO[]> {
  return prisma.timetableImport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getWeekArchives(userId: string) {
  return prisma.weekArchive.findMany({
    where: { userId },
    orderBy: { weekStart: 'desc' },
  });
}

export async function getWeekArchive(userId: string, weekStart: string) {
  return prisma.weekArchive.findUnique({
    where: {
      userId_weekStart: { userId, weekStart },
    },
  });
}

export async function saveWeekArchive(userId: string, weekStart: string, data: any) {
  return prisma.weekArchive.upsert({
    where: {
      userId_weekStart: { userId, weekStart },
    },
    create: {
      userId,
      weekStart,
      data,
    },
    update: {
      data,
    },
  });
}

export async function syncPastWeekArchives(userId: string, currentWeekStart: string) {
  const existingArchives = await prisma.weekArchive.findMany({
    where: { userId },
    select: { weekStart: true },
  });
  const existingDates = new Set(existingArchives.map((a) => a.weekStart));

  const allSessions = await getSessions(userId);
  const currentMonday = new Date(currentWeekStart);

  for (let i = 1; i <= 12; i++) {
    const pastMondayDate = new Date(currentMonday.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const pastWeekStart = pastMondayDate.toISOString().split('T')[0];

    if (!existingDates.has(pastWeekStart)) {
      await prisma.weekArchive.create({
        data: {
          userId,
          weekStart: pastWeekStart,
          data: allSessions as any,
        },
      });
    }
  }

  return getWeekArchives(userId);
}
