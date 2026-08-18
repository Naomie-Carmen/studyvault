import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';

const prisma = new PrismaClient();

export interface UserConsentInput {
  analyticsOptIn?: boolean;
  contentAnalysisOptIn?: boolean;
}

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      university: true,
      program: true,
      level: true,
      role: true,
      gradeMode: true,
      consentAt: true,
      createdAt: true,
      updatedAt: true,
      academicYears: {
        include: {
          semesters: {
            include: {
              ues: {
                include: {
                  subjects: true,
                  ecues: {
                    include: {
                      subjects: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      documents: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          fileSize: true,
          docType: true,
          createdAt: true,
        },
      },
      notes: true,
      timetableSessions: true,
      timetableImports: {
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          status: true,
          createdAt: true,
        },
      },
      consents: true,
    },
  });

  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable.');
  }

  console.log(`[PRIVACY] User ${userId} exported data`);

  return {
    exportDate: new Date().toISOString(),
    legalReference: 'Loi n° 2013-450 du 19 juin 2013 (Côte d\'Ivoire) / ARTCI — Droit à la portabilité (Art. 42)',
    editor: 'Data Service Mica (data.service.mica@gmail.com)',
    userData: user,
  };
}

export async function deleteUserAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable.');
  }

  // Create Archive record for legal 12-month retention
  await prisma.userArchive.create({
    data: {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      reason: 'Suppression par l\'utilisateur (droit à l\'oubli Loi n° 2013-450 / ARTCI)',
    },
  });

  // Delete user account (cascade deletes all personal data)
  await prisma.user.delete({
    where: { id: userId },
  });

  console.log(`[PRIVACY] User ${userId} deleted account`);

  return {
    message: 'Compte supprimé avec succès. Les données ont été archivées pendant 12 mois conformément à la loi.',
  };
}

export async function acceptUserConsent(userId: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { consentAt: new Date() },
    select: { id: true, email: true, consentAt: true },
  });

  console.log(`[PRIVACY] User ${userId} accepted privacy policy`);
  return user;
}

export async function updateUserConsent(userId: string, input: UserConsentInput) {
  await prisma.user.update({
    where: { id: userId },
    data: { consentAt: new Date() },
  });

  return prisma.userConsent.upsert({
    where: { userId },
    update: {
      analyticsOptIn: Boolean(input.analyticsOptIn),
      contentAnalysisOptIn: Boolean(input.contentAnalysisOptIn),
    },
    create: {
      userId,
      analyticsOptIn: Boolean(input.analyticsOptIn),
      contentAnalysisOptIn: Boolean(input.contentAnalysisOptIn),
    },
  });
}

export async function getUserConsent(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { consentAt: true },
  });

  const consent = await prisma.userConsent.findUnique({
    where: { userId },
  });

  return {
    consentAt: user?.consentAt || null,
    analyticsOptIn: consent?.analyticsOptIn || false,
    contentAnalysisOptIn: consent?.contentAnalysisOptIn || false,
    transactionalEmails: true,
  };
}

export function getPrivacyPolicy() {
  return {
    version: '1.0.0',
    effectiveDate: '2026-08-01',
    dataController: 'Data Service Mica — Abidjan, Côte d\'Ivoire',
    dpoContact: 'data.service.mica@gmail.com',
    legalLaw: 'Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel (Côte d\'Ivoire) + ARTCI',
    rights: [
      'Droit d\'accès (Article 39)',
      'Droit de rectification (Article 40)',
      'Droit à l\'oubli / suppression (Article 41)',
      'Droit à la portabilité (Article 42)',
      'Droit d\'opposition (Article 43)',
    ],
  };
}
