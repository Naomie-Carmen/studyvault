import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { sendSuccess } from '../utils/apiResponse';

const prisma = new PrismaClient();

export async function getHealthStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    let dbConnected = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbConnected = true;
    } catch (_e) {
      dbConnected = false;
    }

    const memUsage = process.memoryUsage();

    const healthData = {
      status: dbConnected ? 'ok' : 'degraded',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId || 'N/A',
      metrics: {
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        },
      },
      services: {
        database: dbConnected ? 'online' : 'offline',
        storage: process.env.STORAGE_DRIVER || 'local',
      },
      modules: {
        auth: { name: 'Authentification & Sessions', status: 'online' },
        academicProfile: { name: 'Profil Universitaire', status: 'online' },
        academicStructure: { name: 'Arborescence Pédagogique (UE/ECUE/Matières)', status: 'online' },
        documents: { name: 'Gestion Documentaire & Coffre-fort', status: 'online' },
        search: { name: 'Moteur de Recherche Globale', status: 'online' },
        preview: { name: 'Visionneuse & Aperçu Avancé', status: 'online' },
        timetable: { name: 'Planning & Emploi du Temps', status: 'online' },
        ocrEngine: { name: 'OCR & Parsing Heuristique', status: 'online' },
        intelligentClassification: { name: 'Moteur de Classement IA & Validation', status: 'online' },
        rgpdCompliance: { name: 'Conformité RGPD & Export/Suppression', status: 'online' },
      },
    };

    sendSuccess(res, healthData);
  } catch (err) {
    next(err);
  }
}
