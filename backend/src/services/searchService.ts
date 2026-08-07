import { PrismaClient, Prisma } from '@prisma/client';
import { SearchQueryParams, SearchResultDTO } from '../types/search';
import { DocumentDTO } from '../types/document';

const prisma = new PrismaClient();

export async function searchDocuments(
  userId: string,
  params: SearchQueryParams
): Promise<SearchResultDTO> {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const skip = (page - 1) * limit;

  const where: Prisma.DocumentWhereInput = {
    userId,
    isDeleted: false,
  };

  // Text search query
  if (params.q && params.q.trim()) {
    const q = params.q.trim();
    where.OR = [
      { originalName: { contains: q } },
      { docType: { contains: q } },
      { subject: { name: { contains: q } } },
      { subject: { ue: { title: { contains: q } } } },
    ];
  }

  // Subject filter
  if (params.subjectId) {
    where.subjectId = params.subjectId;
  }

  // UE filter
  if (params.ueId) {
    where.subject = { ueId: params.ueId };
  }

  // Semester filter
  if (params.semesterId) {
    where.subject = { ue: { semesterId: params.semesterId } };
  }

  // DocType filter
  if (params.docType) {
    where.docType = params.docType;
  }

  // Personal Folder filter
  if (params.personalFolderId) {
    where.personalFolderId = params.personalFolderId;
  }

  // Date From & To filters
  if (params.dateFrom || params.dateTo) {
    where.createdAt = {};
    if (params.dateFrom) where.createdAt.gte = new Date(params.dateFrom);
    if (params.dateTo) where.createdAt.lte = new Date(params.dateTo);
  }

  // Favorites filter
  if (params.isFavorite) {
    where.favorites = {
      some: { userId },
    };
  }

  // Tag filter
  if (params.tagId) {
    where.documentTags = {
      some: { tagId: params.tagId },
    };
  }

  // Sorting logic
  let orderBy: Prisma.DocumentOrderByWithRelationInput = { createdAt: 'desc' };
  switch (params.sort) {
    case 'date_asc':
      orderBy = { createdAt: 'asc' };
      break;
    case 'date_desc':
      orderBy = { createdAt: 'desc' };
      break;
    case 'name_asc':
      orderBy = { originalName: 'asc' };
      break;
    case 'name_desc':
      orderBy = { originalName: 'desc' };
      break;
    case 'size_asc':
      orderBy = { fileSize: 'asc' };
      break;
    case 'size_desc':
      orderBy = { fileSize: 'desc' };
      break;
    case 'relevance':
    default:
      orderBy = { createdAt: 'desc' };
      break;
  }

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        subject: {
          select: { name: true, color: true },
        },
      },
    }),
    prisma.document.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    documents: documents as unknown as DocumentDTO[],
    total,
    page,
    limit,
    totalPages,
  };
}
