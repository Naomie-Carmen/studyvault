import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { ApiError } from '../../utils/apiError';
import { parseTimetableText } from './timetableParser';
import { findBestSubjectMatch } from './subjectMatcher';
import * as timetableService from '../timetableService';

const prisma = new PrismaClient();

export interface TimetableSuggestionDTO {
  id: string;
  timetableImportId: string;
  detectedSubjectName: string;
  matchedSubjectId?: string | null;
  matchedSubjectName?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
  room?: string | null;
  sessionType?: string | null;
  confidenceScore: number;
  status: string;
  createdAt: Date | string;
}

export async function processTimetableImport(
  userId: string,
  importId: string
): Promise<{ status: string; count: number }> {
  const imp = await prisma.timetableImport.findUnique({
    where: { id: importId },
  });

  if (!imp || imp.userId !== userId) {
    throw ApiError.notFound('Import d\'emploi du temps introuvable ou accès refusé.');
  }

  // Update status to processing
  await prisma.timetableImport.update({
    where: { id: importId },
    data: { status: 'processing' },
  });

  // Extract text or read file content
  let fileText = '';
  if (fs.existsSync(imp.filePath)) {
    try {
      fileText = fs.readFileSync(imp.filePath, 'utf-8');
    } catch (_e) {
      fileText = imp.fileName;
    }
  }

  // Parse structured sessions from text
  const parsed = parseTimetableText(fileText);

  // Fetch existing user subjects for fuzzy matching
  const userSubjects = await prisma.subject.findMany({
    where: {
      ue: {
        semester: {
          academicYear: {
            userId,
          },
        },
      },
    },
    select: { id: true, name: true },
  });

  // Clear any existing suggestions for this import
  await prisma.timetableSuggestion.deleteMany({
    where: { timetableImportId: importId },
  });

  // Create suggestions with confidence scoring & matching
  for (const s of parsed) {
    const { matchedSubjectId } = findBestSubjectMatch(s.detectedSubjectName, userSubjects);

    // Calculate score 0-100
    let confidenceScore = 40; // Base score
    if (s.dayOfWeek !== undefined) confidenceScore += 20;
    if (s.startTime && s.endTime) confidenceScore += 20;
    if (matchedSubjectId) confidenceScore += 20;
    confidenceScore = Math.min(100, confidenceScore);

    await prisma.timetableSuggestion.create({
      data: {
        timetableImportId: importId,
        detectedSubjectName: s.detectedSubjectName,
        matchedSubjectId,
        dayOfWeek: s.dayOfWeek !== undefined ? s.dayOfWeek : 0,
        startTime: s.startTime || '08:30',
        endTime: s.endTime || '10:30',
        room: s.room || 'Salle A1',
        sessionType: s.sessionType || 'CM',
        confidenceScore,
        status: 'pending',
      },
    });
  }

  // Mark import as completed
  await prisma.timetableImport.update({
    where: { id: importId },
    data: { status: 'completed' },
  });

  return { status: 'completed', count: parsed.length };
}

export async function getSuggestions(
  userId: string,
  importId: string
): Promise<{
  suggestions: TimetableSuggestionDTO[];
  stats: { total: number; highConfidence: number; mediumConfidence: number; lowConfidence: number };
}> {
  const imp = await prisma.timetableImport.findUnique({
    where: { id: importId },
  });

  if (!imp || imp.userId !== userId) {
    throw ApiError.notFound('Import introuvable.');
  }

  const suggestions = await prisma.timetableSuggestion.findMany({
    where: { timetableImportId: importId },
    orderBy: { confidenceScore: 'desc' },
  });

  // Get subject names for matchedSubjectId
  const subjectIds = suggestions.map((s) => s.matchedSubjectId).filter(Boolean) as string[];
  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true, name: true },
  });
  const subjectMap = new Map(subjects.map((sub) => [sub.id, sub.name]));

  const dtos: TimetableSuggestionDTO[] = suggestions.map((s) => ({
    ...(s as unknown as TimetableSuggestionDTO),
    matchedSubjectName: s.matchedSubjectId ? subjectMap.get(s.matchedSubjectId) || null : null,
  }));

  const highConfidence = dtos.filter((s) => s.confidenceScore >= 80).length;
  const mediumConfidence = dtos.filter((s) => s.confidenceScore >= 50 && s.confidenceScore < 80).length;
  const lowConfidence = dtos.filter((s) => s.confidenceScore < 50).length;

  return {
    suggestions: dtos,
    stats: {
      total: dtos.length,
      highConfidence,
      mediumConfidence,
      lowConfidence,
    },
  };
}

export async function validateSuggestions(
  userId: string,
  importId: string,
  selectedSuggestionIds: string[],
  corrections?: { suggestionId: string; subjectId?: string; dayOfWeek?: number; startTime?: string; endTime?: string; room?: string; sessionType?: string }[]
): Promise<{ createdCount: number }> {
  const imp = await prisma.timetableImport.findUnique({
    where: { id: importId },
  });

  if (!imp || imp.userId !== userId) {
    throw ApiError.notFound('Import introuvable.');
  }

  const suggestions = await prisma.timetableSuggestion.findMany({
    where: {
      timetableImportId: importId,
      id: { in: selectedSuggestionIds },
    },
  });

  let createdCount = 0;
  const correctionMap = new Map((corrections || []).map((c) => [c.suggestionId, c]));

  for (const s of suggestions) {
    const corr = correctionMap.get(s.id);

    const targetSubjectId = corr?.subjectId || s.matchedSubjectId;
    if (!targetSubjectId) {
      // Skip if no subject is assigned or matched
      continue;
    }

    const dayOfWeek = corr?.dayOfWeek !== undefined ? corr.dayOfWeek : s.dayOfWeek ?? 0;
    const startTime = corr?.startTime || s.startTime || '08:30';
    const endTime = corr?.endTime || s.endTime || '10:30';
    const room = corr?.room !== undefined ? corr.room : s.room;
    const sessionType = (corr?.sessionType || s.sessionType || 'CM') as 'CM' | 'TD' | 'TP' | 'EXAM' | 'OTHER';

    await timetableService.createSession(userId, {
      subjectId: targetSubjectId,
      dayOfWeek,
      startTime,
      endTime,
      room: room || undefined,
      sessionType,
      recurrence: 'weekly',
    });

    // Mark suggestion as accepted
    await prisma.timetableSuggestion.update({
      where: { id: s.id },
      data: { status: 'accepted' },
    });

    createdCount++;
  }

  return { createdCount };
}

export async function rejectSuggestions(
  userId: string,
  importId: string
): Promise<void> {
  const imp = await prisma.timetableImport.findUnique({
    where: { id: importId },
  });

  if (!imp || imp.userId !== userId) {
    throw ApiError.notFound('Import introuvable.');
  }

  await prisma.timetableImport.update({
    where: { id: importId },
    data: { status: 'rejected' },
  });

  await prisma.timetableSuggestion.updateMany({
    where: { timetableImportId: importId },
    data: { status: 'rejected' },
  });
}
