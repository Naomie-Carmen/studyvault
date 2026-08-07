import { PrismaClient } from '@prisma/client';
import { USER_QUOTA_LIMIT_BYTES } from './fileStorageService';
import { DashboardStatsDTO } from '../types/search';
import { DocumentDTO } from '../types/document';

const prisma = new PrismaClient();

export async function getDashboardStats(userId: string): Promise<DashboardStatsDTO> {
  const [
    totalDocs,
    byTypeRaw,
    quotaAgg,
    favCount,
    quickCount,
    recentUploads,
    mostUsedSubjectsRaw,
  ] = await Promise.all([
    prisma.document.count({
      where: { userId, isDeleted: false },
    }),

    prisma.document.groupBy({
      by: ['docType'],
      where: { userId, isDeleted: false },
      _count: { id: true },
    }),

    prisma.document.aggregate({
      where: { userId },
      _sum: { fileSize: true },
    }),

    prisma.favorite.count({
      where: { userId },
    }),

    prisma.quickAccess.count({
      where: { userId },
    }),

    prisma.document.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        subject: { select: { name: true, color: true } },
      },
    }),

    prisma.subject.findMany({
      where: { ue: { semester: { academicYear: { userId } } } },
      select: {
        id: true,
        name: true,
        _count: {
          select: { documents: { where: { isDeleted: false } } },
        },
      },
      orderBy: {
        documents: { _count: 'desc' },
      },
      take: 5,
    }),
  ]);

  const documentsByType = {
    cours: 0,
    TD: 0,
    TP: 0,
    examen: 0,
    autre: 0,
  };

  byTypeRaw.forEach((item) => {
    if (item.docType in documentsByType) {
      (documentsByType as Record<string, number>)[item.docType] = item._count.id;
    } else {
      documentsByType.autre += item._count.id;
    }
  });

  const storageUsedBytes = quotaAgg._sum.fileSize || 0;

  const mostUsedSubjects = mostUsedSubjectsRaw.map((s) => ({
    id: s.id,
    name: s.name,
    documentCount: s._count.documents,
  }));

  return {
    totalDocuments: totalDocs,
    documentsByType,
    storageUsedBytes,
    storageQuotaBytes: USER_QUOTA_LIMIT_BYTES,
    favoritesCount: favCount,
    quickAccessCount: quickCount,
    recentUploads: recentUploads as unknown as DocumentDTO[],
    mostUsedSubjects,
  };
}
