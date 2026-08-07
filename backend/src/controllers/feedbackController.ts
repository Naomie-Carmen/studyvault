import { Request, Response } from 'express';
import * as feedbackService from '../services/feedbackService';

/**
 * POST /api/v1/feedback
 * Submit user feedback with auto-captured metadata.
 */
export async function submitFeedback(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: 'Authentification requise.' } });
      return;
    }

    const { type, message, rating, screenshotUrl, pageUrl, browserInfo, osInfo, appVersion } = req.body;

    if (!type || !['bug', 'suggestion', 'love', 'question'].includes(type)) {
      res.status(400).json({ success: false, error: { message: 'Type de feedback invalide.' } });
      return;
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      res.status(400).json({ success: false, error: { message: 'Le message de feedback est requis.' } });
      return;
    }

    const feedback = await feedbackService.createFeedback({
      userId: req.user.id,
      type,
      message: message.trim(),
      rating: rating ? parseInt(String(rating), 10) : undefined,
      screenshotUrl,
      pageUrl,
      browserInfo,
      osInfo,
      appVersion,
    });

    res.status(201).json({
      success: true,
      data: {
        id: feedback.id,
        message: 'Merci pour votre retour ! Notre équipe étudie vos suggestions.',
        createdAt: feedback.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de l\'envoi du feedback.' } });
  }
}

/**
 * GET /api/v1/feedback
 * Admin-only: List all submitted user feedbacks.
 */
export async function getFeedbacks(req: Request, res: Response): Promise<void> {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

    const data = await feedbackService.getAllFeedbacks(limit, offset);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la récupération des feedbacks.' } });
  }
}
