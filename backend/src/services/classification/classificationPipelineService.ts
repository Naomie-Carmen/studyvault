import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../utils/apiError';
import { analyzeFilename } from './filenameAnalyzerService';
import { ClassificationSuggestionDTO } from '../../types/classification';

const prisma = new PrismaClient();

export async function analyzeAndSuggest(
  userId: string,
  documentId: string
): Promise<ClassificationSuggestionDTO> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  // Get user's subjects
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

  // Analyze filename
  const result = analyzeFilename(doc.originalName, userSubjects);

  // Clear existing suggestions for this document
  await prisma.classificationSuggestion.deleteMany({
    where: { documentId },
  });

  const suggestion = await prisma.classificationSuggestion.create({
    data: {
      documentId,
      userId,
      proposedSubjectId: result.matchedSubjectId,
      proposedDocType: result.detectedDocType,
      confidenceScore: result.confidenceScore,
      explanation: result.explanation,
      source: 'filename',
      status: 'pending',
    },
  });

  const matchedSubject = userSubjects.find((s) => s.id === result.matchedSubjectId);

  return {
    ...(suggestion as unknown as ClassificationSuggestionDTO),
    proposedSubjectName: matchedSubject ? matchedSubject.name : null,
  };
}

export async function getSuggestion(
  userId: string,
  documentId: string
): Promise<ClassificationSuggestionDTO | null> {
  const suggestion = await prisma.classificationSuggestion.findFirst({
    where: { documentId, userId },
    orderBy: { createdAt: 'desc' },
  });

  if (!suggestion) return null;

  let proposedSubjectName = null;
  if (suggestion.proposedSubjectId) {
    const sub = await prisma.subject.findUnique({
      where: { id: suggestion.proposedSubjectId },
      select: { name: true },
    });
    proposedSubjectName = sub?.name || null;
  }

  return {
    ...(suggestion as unknown as ClassificationSuggestionDTO),
    proposedSubjectName,
  };
}

export async function acceptSuggestion(
  userId: string,
  documentId: string
): Promise<{ message: string }> {
  const suggestion = await prisma.classificationSuggestion.findFirst({
    where: { documentId, userId, status: 'pending' },
  });

  if (!suggestion) {
    throw ApiError.notFound('Aucune suggestion en attente pour ce document.');
  }

  // Update document classification
  await prisma.document.update({
    where: { id: documentId },
    data: {
      subjectId: suggestion.proposedSubjectId,
      docType: suggestion.proposedDocType,
    },
  });

  // Mark suggestion as accepted
  await prisma.classificationSuggestion.update({
    where: { id: suggestion.id },
    data: {
      status: 'accepted',
      resolvedAt: new Date(),
    },
  });

  return { message: 'Document classé avec succès.' };
}

export async function modifySuggestion(
  userId: string,
  documentId: string,
  subjectId: string,
  docType: string
): Promise<{ message: string }> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable.');
  }

  await prisma.document.update({
    where: { id: documentId },
    data: {
      subjectId,
      docType,
    },
  });

  await prisma.classificationSuggestion.updateMany({
    where: { documentId, userId, status: 'pending' },
    data: {
      status: 'modified',
      modifiedSubjectId: subjectId,
      modifiedDocType: docType,
      resolvedAt: new Date(),
    },
  });

  return { message: 'Emplacement du document mis à jour.' };
}

export async function rejectSuggestion(
  userId: string,
  documentId: string
): Promise<{ message: string }> {
  await prisma.classificationSuggestion.updateMany({
    where: { documentId, userId, status: 'pending' },
    data: {
      status: 'rejected',
      resolvedAt: new Date(),
    },
  });

  return { message: 'Suggestion rejetée.' };
}

export async function getUnclassifiedDocuments(userId: string) {
  return prisma.document.findMany({
    where: {
      userId,
      isDeleted: false,
      subjectId: null,
      personalFolderId: null,
    },
    include: {
      classificationSuggestions: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}
