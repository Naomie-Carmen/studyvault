import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { FavoriteDTO } from '../types/search';

const prisma = new PrismaClient();
const MAX_FAVORITES_PER_USER = 50;

export async function addFavorite(userId: string, documentId: string): Promise<FavoriteDTO> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  const currentCount = await prisma.favorite.count({
    where: { userId },
  });

  if (currentCount >= MAX_FAVORITES_PER_USER) {
    throw ApiError.badRequest(`Vous avez atteint la limite maximale de ${MAX_FAVORITES_PER_USER} favoris.`);
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_documentId: { userId, documentId },
    },
    create: { userId, documentId },
    update: {},
    include: { document: true },
  });

  return favorite as unknown as FavoriteDTO;
}

export async function removeFavorite(userId: string, documentId: string): Promise<void> {
  await prisma.favorite.deleteMany({
    where: { userId, documentId },
  });
}

export async function getFavorites(userId: string): Promise<FavoriteDTO[]> {
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      document: {
        include: {
          subject: { select: { name: true, color: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return favorites as unknown as FavoriteDTO[];
}
