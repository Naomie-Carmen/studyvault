import { PrismaClient } from '@prisma/client';
import { ApiError } from '../utils/apiError';

const prisma = new PrismaClient();

export interface UserConsentInput {
  analyticsOptIn: boolean;
  contentAnalysisOptIn: boolean;
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

  return {
    exportDate: new Date().toISOString(),
    compliance: 'RGPD Article 20 - Droit à la portabilité des données',
    userData: user,
  };
}

export async function scheduleAccountDeletion(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable.');
  }

  const purgeDate = new Date();
  purgeDate.setDate(purgeDate.getDate() + 30); // 30-day grace period

  // Soft delete user and revoke all refresh tokens
  await prisma.user.update({
    where: { id: userId },
    data: {
      isScheduledForPurge: true,
      purgeScheduledAt: purgeDate,
    },
  });

  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });

  return {
    message: 'Compte désactivé et programmé pour suppression définitive sous 30 jours.',
    purgeScheduledAt: purgeDate.toISOString(),
  };
}

export async function updateUserConsent(userId: string, input: UserConsentInput) {
  return prisma.userConsent.upsert({
    where: { userId },
    update: {
      analyticsOptIn: input.analyticsOptIn,
      contentAnalysisOptIn: input.contentAnalysisOptIn,
    },
    create: {
      userId,
      analyticsOptIn: input.analyticsOptIn,
      contentAnalysisOptIn: input.contentAnalysisOptIn,
    },
  });
}

export async function getUserConsent(userId: string) {
  const consent = await prisma.userConsent.findUnique({
    where: { userId },
  });

  if (!consent) {
    return {
      analyticsOptIn: false,
      contentAnalysisOptIn: false,
      transactionalEmails: true,
    };
  }

  return consent;
}

export function getPrivacyPolicy() {
  return {
    version: '1.0.0',
    effectiveDate: '2026-01-01',
    dataController: 'StudyVault SAS - 75005 Paris, France',
    dpoContact: 'dpo@studyvault.fr',
    rights: [
      'Droit d\'accès (Article 15 RGPD)',
      'Droit de rectification (Article 16 RGPD)',
      'Droit à l\'effacement / Droit à l\'oubli (Article 17 RGPD)',
      'Droit à la limitation du traitement (Article 18 RGPD)',
      'Droit à la portabilité des données (Article 20 RGPD)',
      'Droit d\'opposition (Article 21 RGPD)',
    ],
    retentionPeriods: {
      documents: 'Conservés tant que le compte est actif',
      trash: 'Purge automatique au bout de 30 jours',
      deletedAccount: 'Purge définitive sous 30 jours',
      logs: '1 an maximum',
    },
  };
}
