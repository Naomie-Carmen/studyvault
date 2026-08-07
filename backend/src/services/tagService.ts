import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { TagDTO } from '../types/search';

const prisma = new PrismaClient();

export async function createTag(userId: string, name: string, color?: string): Promise<TagDTO> {
  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name } },
  });

  if (existing) {
    return existing;
  }

  return prisma.tag.create({
    data: {
      userId,
      name,
      color: color || '#6366f1',
    },
  });
}

export async function getTags(userId: string): Promise<TagDTO[]> {
  return prisma.tag.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
  });
}

export async function deleteTag(userId: string, tagId: string): Promise<void> {
  const tag = await prisma.tag.findUnique({
    where: { id: tagId },
  });

  if (!tag || tag.userId !== userId) {
    throw ApiError.notFound('Tag introuvable.');
  }

  await prisma.tag.delete({
    where: { id: tagId },
  });
}

export async function addTagToDocument(
  userId: string,
  documentId: string,
  tagId: string
): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable.');
  }

  await prisma.documentTag.upsert({
    where: {
      documentId_tagId: { documentId, tagId },
    },
    create: { documentId, tagId },
    update: {},
  });
}

export async function removeTagFromDocument(
  documentId: string,
  tagId: string
): Promise<void> {
  await prisma.documentTag.deleteMany({
    where: { documentId, tagId },
  });
}
