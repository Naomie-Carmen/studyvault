import { Request, Response } from 'express';
import * as betaService from '../services/betaService';

/**
 * POST /api/v1/beta/invite
 * Admin-only: Generate and send a beta invitation code.
 */
export async function inviteUser(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Adresse email requise.' } });
      return;
    }

    const invite = await betaService.createBetaInvite(email, req.user?.id || 'admin');
    res.status(201).json({
      success: true,
      data: {
        id: invite.id,
        email: invite.email,
        inviteCode: invite.inviteCode,
        expiresAt: invite.expiresAt,
        status: invite.status,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la création de l\'invitation.' } });
  }
}

/**
 * POST /api/v1/beta/validate
 * Public: Validate a beta invite code.
 */
export async function validateCode(req: Request, res: Response): Promise<void> {
  try {
    const { inviteCode } = req.body;
    const result = await betaService.validateInviteCode(inviteCode);
    if (result.valid) {
      res.json({ success: true, data: result });
    } else {
      res.status(400).json({ success: false, error: { message: result.message } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la validation du code.' } });
  }
}

/**
 * GET /api/v1/beta/status
 * Auth required: Get current user's beta status.
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user?.id) {
      res.status(401).json({ success: false, error: { message: 'Non authentifié.' } });
      return;
    }

    const status = await betaService.getUserBetaStatus(req.user.id);
    res.json({ success: true, data: status });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de la récupération du statut bêta.' } });
  }
}

/**
 * POST /api/v1/beta/waitlist
 * Public: Join the waitlist.
 */
export async function joinWaitlistController(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      res.status(400).json({ success: false, error: { message: 'Adresse email requise.' } });
      return;
    }

    const result = await betaService.joinWaitlist(email);
    if (result.success) {
      res.json({ success: true, data: { message: result.message } });
    } else {
      res.status(400).json({ success: false, error: { message: result.message } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: { message: 'Erreur lors de l\'inscription sur la liste d\'attente.' } });
  }
}
