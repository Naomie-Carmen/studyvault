import { PrismaClient, Prisma } from '@prisma/client';
import { ApiError } from '../utils/apiError';
import { storeUserFile, deletePhysicalFile, USER_QUOTA_LIMIT_BYTES } from './fileStorageService';
import { DocumentDTO, PersonalFolderDTO, UserQuotaDTO } from '../types/document';
import { DocumentUpdateInput, PersonalFolderInput } from '../utils/validators';

const prisma = new PrismaClient();

export async function getUserQuota(userId: string): Promise<UserQuotaDTO> {
  const result = await prisma.document.aggregate({
    where: { userId },
    _sum: { fileSize: true },
    _count: { id: true },
  });

  const usedBytes = result._sum.fileSize || 0;
  const documentCount = result._count.id || 0;
  const usedPercentage = Math.min(
    100,
    parseFloat(((usedBytes / USER_QUOTA_LIMIT_BYTES) * 100).toFixed(2))
  );

  return {
    usedBytes,
    limitBytes: USER_QUOTA_LIMIT_BYTES,
    usedPercentage,
    documentCount,
  };
}

export async function uploadDocuments(
  userId: string,
  files: Express.Multer.File[],
  params: { subjectId?: string; personalFolderId?: string; docType?: string }
): Promise<DocumentDTO[]> {
  if (!files || files.length === 0) {
    throw ApiError.badRequest('Aucun fichier transmis.');
  }

  // A document must belong to EITHER subjectId OR personalFolderId
  if (params.subjectId && params.personalFolderId) {
    throw ApiError.badRequest('Un document ne peut pas appartenir simultanément à une matière et un coffre-fort.');
  }

  if (params.subjectId) {
    const subject = await prisma.subject.findUnique({
      where: { id: params.subjectId },
      include: { ue: { include: { semester: { include: { academicYear: true } } } } },
    });
    if (!subject || subject.ue?.semester.academicYear.userId !== userId) {
      throw ApiError.notFound('Matière introuvable ou accès refusé.');
    }
  }

  if (params.personalFolderId) {
    const folder = await prisma.personalFolder.findUnique({
      where: { id: params.personalFolderId },
    });
    if (!folder || folder.userId !== userId) {
      throw ApiError.notFound('Dossier personnel introuvable ou accès refusé.');
    }
  }

  // Calculate quota
  const totalUploadSize = files.reduce((acc, f) => acc + f.size, 0);
  const quota = await getUserQuota(userId);
  if (quota.usedBytes + totalUploadSize > USER_QUOTA_LIMIT_BYTES) {
    throw ApiError.badRequest('Quota de stockage dépassé (limite de 2 Go). Veuillez libérer de l\'espace.');
  }

  const createdDocs: DocumentDTO[] = [];

  for (const file of files) {
    try {
      const stored = await storeUserFile(userId, file.path, file.originalname);

      const doc = await prisma.document.create({
        data: {
          userId,
          subjectId: params.subjectId || null,
          personalFolderId: params.personalFolderId || null,
          originalName: file.originalname,
          filePath: stored.finalPath,
          mimeType: file.mimetype,
          fileSize: stored.size,
          docType: params.docType || 'cours',
          status: 'ready',
          isDeleted: false,
        },
      });

      createdDocs.push(doc);
    } catch (err) {
      console.error(`Error uploading file ${file.originalname}:`, err);
    }
  }

  return createdDocs;
}

export async function getDocuments(
  userId: string,
  filters: {
    subjectId?: string;
    personalFolderId?: string;
    docType?: string;
    search?: string;
    isPersonalVault?: boolean;
  }
): Promise<DocumentDTO[]> {
  const where: Prisma.DocumentWhereInput = {
    userId,
    isDeleted: false,
  };

  if (filters.subjectId) {
    where.subjectId = filters.subjectId;
  }

  if (filters.personalFolderId) {
    where.personalFolderId = filters.personalFolderId;
  } else if (filters.isPersonalVault) {
    where.personalFolderId = { not: null };
  }

  if (filters.docType) {
    where.docType = filters.docType;
  }

  if (filters.search && filters.search.trim()) {
    where.originalName = {
      contains: filters.search.trim(),
    };
  }

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

export async function getDocumentById(userId: string, documentId: string): Promise<DocumentDTO> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  return doc;
}

export async function updateDocument(
  userId: string,
  documentId: string,
  input: DocumentUpdateInput
): Promise<DocumentDTO> {
  await getDocumentById(userId, documentId);

  return prisma.document.update({
    where: { id: documentId },
    data: {
      ...(input.originalName ? { originalName: input.originalName } : {}),
      ...(input.docType ? { docType: input.docType } : {}),
      ...(input.subjectId !== undefined ? { subjectId: input.subjectId, personalFolderId: null } : {}),
      ...(input.personalFolderId !== undefined ? { personalFolderId: input.personalFolderId, subjectId: null } : {}),
    },
  });
}

export async function softDeleteDocument(userId: string, documentId: string): Promise<DocumentDTO> {
  await getDocumentById(userId, documentId);

  return prisma.document.update({
    where: { id: documentId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
    },
  });
}

export async function restoreDocument(userId: string, documentId: string): Promise<DocumentDTO> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  return prisma.document.update({
    where: { id: documentId },
    data: {
      isDeleted: false,
      deletedAt: null,
    },
  });
}

export async function getTrashDocuments(userId: string): Promise<DocumentDTO[]> {
  return prisma.document.findMany({
    where: { userId, isDeleted: true },
    orderBy: { deletedAt: 'desc' },
  });
}

export async function permanentlyDeleteDocument(userId: string, documentId: string): Promise<void> {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
  });

  if (!doc || doc.userId !== userId) {
    throw ApiError.notFound('Document introuvable ou accès refusé.');
  }

  // Delete physical file from storage
  deletePhysicalFile(doc.filePath);

  // Delete database record
  await prisma.document.delete({
    where: { id: documentId },
  });
}

export async function emptyTrash(userId: string): Promise<{ deletedCount: number }> {
  const trashDocs = await prisma.document.findMany({
    where: { userId, isDeleted: true },
  });

  for (const doc of trashDocs) {
    deletePhysicalFile(doc.filePath);
  }

  const result = await prisma.document.deleteMany({
    where: { userId, isDeleted: true },
  });

  return { deletedCount: result.count };
}

// Personal Folders (Coffre-fort) Service
export async function createPersonalFolder(
  userId: string,
  input: PersonalFolderInput
): Promise<PersonalFolderDTO> {
  return prisma.personalFolder.create({
    data: {
      userId,
      categoryType: input.categoryType,
      name: input.name,
    },
  });
}

export async function getPersonalFolders(userId: string): Promise<PersonalFolderDTO[]> {
  const folders = await prisma.personalFolder.findMany({
    where: { userId },
    include: {
      _count: {
        select: { documents: { where: { isDeleted: false } } },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  return folders.map((f) => ({
    id: f.id,
    userId: f.userId,
    categoryType: f.categoryType,
    name: f.name,
    documentCount: f._count.documents,
    createdAt: f.createdAt,
  }));
}

export async function deletePersonalFolder(userId: string, folderId: string): Promise<void> {
  const folder = await prisma.personalFolder.findUnique({
    where: { id: folderId },
  });

  if (!folder || folder.userId !== userId) {
    throw ApiError.notFound('Dossier personnel introuvable.');
  }

  await prisma.personalFolder.delete({
    where: { id: folderId },
  });
}
