import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateFeedbackData {
  userId: string;
  type: 'bug' | 'suggestion' | 'love' | 'question';
  message: string;
  rating?: number;
  screenshotUrl?: string;
  pageUrl?: string;
  browserInfo?: string;
  osInfo?: string;
  appVersion?: string;
}

export async function createFeedback(data: CreateFeedbackData) {
  const feedback = await prisma.feedback.create({
    data: {
      userId: data.userId,
      type: data.type,
      message: data.message,
      rating: data.rating || null,
      screenshotUrl: data.screenshotUrl || null,
      pageUrl: data.pageUrl || null,
      browserInfo: data.browserInfo || null,
      osInfo: data.osInfo || null,
      appVersion: data.appVersion || '1.0.0',
    },
  });

  // Increment user's feedback count
  await prisma.user.update({
    where: { id: data.userId },
    data: { betaFeedbackCount: { increment: 1 } },
  }).catch(() => {});

  return feedback;
}

export async function getAllFeedbacks(limit: number = 50, offset: number = 0) {
  const [items, total] = await Promise.all([
    prisma.feedback.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    }),
    prisma.feedback.count(),
  ]);

  return { items, total };
}
