import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/v1/admin/dashboard
 * Admin-only: Beta metrics dashboard including user counts, active users (7d),
 * document uploads, feedback counts by type, and classification acceptance rate.
 */
export async function getAdminMetrics(_req: Request, res: Response): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      activeBetaUsers,
      totalInvites,
      usedInvites,
      waitlistCount,
      totalDocuments,
      feedbackCounts,
      classificationStats,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({
        where: {
          updatedAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.betaInvite.count(),
      prisma.betaInvite.count({ where: { status: 'used' } }),
      prisma.waitlist.count(),
      prisma.document.count({ where: { isDeleted: false } }),
      prisma.feedback.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
      prisma.classificationSuggestion.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    // Calculate classification acceptance rate
    const acceptedCount = classificationStats.find((s) => s.status === 'accepted')?._count.status || 0;
    const totalClassified = classificationStats.reduce((acc, curr) => acc + curr._count.status, 0);
    const classificationAcceptanceRate = totalClassified > 0 ? Math.round((acceptedCount / totalClassified) * 100) : 100;

    // Convert feedback array to object
    const feedbacksByType = {
      bug: feedbackCounts.find((f) => f.type === 'bug')?._count.type || 0,
      suggestion: feedbackCounts.find((f) => f.type === 'suggestion')?._count.type || 0,
      love: feedbackCounts.find((f) => f.type === 'love')?._count.type || 0,
      question: feedbackCounts.find((f) => f.type === 'question')?._count.type || 0,
    };

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          activeLast7Days: activeBetaUsers,
        },
        invites: {
          total: totalInvites,
          used: usedInvites,
          pending: totalInvites - usedInvites,
          waitlistCount,
        },
        usage: {
          totalDocuments,
          classificationAcceptanceRate,
        },
        feedbacks: feedbacksByType,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la récupération des métriques admin.' } });
  }
}
