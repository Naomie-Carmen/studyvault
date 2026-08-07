import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { DocumentDTO } from '../types/document';

const prisma = new PrismaClient();

export interface DocumentMetadataDTO {
  document: DocumentDTO;
  pageCountEstimate?: number;
  viewCount: number;
  totalDurationSeconds: number;
  lastViewedAt?: Date | string | null;
  subjectName?: string | null;
  ueTitle?: string | null;
  semesterNumber?: number | null;
}

export async function recordDocumentView(
  userId: string,
  documentId: string,
  durationSeconds: number = 0
): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  await prisma.documentView.create({
    data: {
      userId,
      documentId,
      durationSeconds: Math.max(0, Number(durationSeconds) || 0),
    },
  });
}

export async function getRecentlyViewedDocuments(userId: string): Promise<DocumentDTO[]> {
  const views = await prisma.documentView.findMany({
    where: { userId },
    orderBy: { viewedAt: 'desc' },
    distinct: ['documentId'],
    take: 10,
    include: {
      document: {
        include: {
          subject: { select: { name: true, color: true } },
        },
      },
    },
  });

  return views.map((v) => v.document as unknown as DocumentDTO);
}

export async function getDocumentMetadata(
  userId: string,
  documentId: string
): Promise<DocumentMetadataDTO> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      subject: {
        include: {
          ue: {
            include: {
              semester: true,
            },
          },
        },
      },
      documentViews: {
        where: { userId },
        orderBy: { viewedAt: 'desc' },
      },
    },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  // Estimate page count for PDF based on fileSize (~40 KB per page average)
  let pageCountEstimate: number | undefined;
  if (doc.mimeType === 'application/pdf') {
    pageCountEstimate = Math.max(1, Math.round(doc.fileSize / (40 * 1024)));
  }

  const viewCount = doc.documentViews.length;
  const totalDurationSeconds = doc.documentViews.reduce((acc, v) => acc + v.durationSeconds, 0);
  const lastViewedAt = doc.documentViews[0]?.viewedAt || null;

  return {
    document: doc as unknown as DocumentDTO,
    pageCountEstimate,
    viewCount,
    totalDurationSeconds,
    lastViewedAt,
    subjectName: doc.subject?.name || null,
    ueTitle: doc.subject?.ue?.title || null,
    semesterNumber: doc.subject?.ue?.semester?.number || null,
  };
}
