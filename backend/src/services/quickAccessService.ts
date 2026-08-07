import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { QuickAccessDTO } from '../types/search';

const prisma = new PrismaClient();
const MAX_QUICK_ACCESS_PER_USER = 10;

export async function addQuickAccess(userId: string, documentId: string): Promise<QuickAccessDTO> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  const currentCount = await prisma.quickAccess.count({
    where: { userId },
  });

  if (currentCount >= MAX_QUICK_ACCESS_PER_USER) {
    throw ApiError.badRequest(`Vous avez atteint la limite maximale de ${MAX_QUICK_ACCESS_PER_USER} accès rapides.`);
  }

  const quickAccess = await prisma.quickAccess.upsert({
    where: {
      userId_documentId: { userId, documentId },
    },
    create: { userId, documentId, position: currentCount },
    update: {},
    include: { document: true },
  });

  return quickAccess as unknown as QuickAccessDTO;
}

export async function removeQuickAccess(userId: string, documentId: string): Promise<void> {
  await prisma.quickAccess.deleteMany({
    where: { userId, documentId },
  });
}

export async function getQuickAccessList(userId: string): Promise<QuickAccessDTO[]> {
  const list = await prisma.quickAccess.findMany({
    where: { userId },
    include: {
      document: {
        include: {
          subject: { select: { name: true, color: true } },
        },
      },
    },
    orderBy: { position: 'asc' },
  });

  return list as unknown as QuickAccessDTO[];
}

export async function reorderQuickAccess(
  userId: string,
  orderedDocumentIds: string[]
): Promise<void> {
  for (let i = 0; i < orderedDocumentIds.length; i++) {
    await prisma.quickAccess.updateMany({
      where: { userId, documentId: orderedDocumentIds[i] },
      data: { position: i },
    });
  }
}
