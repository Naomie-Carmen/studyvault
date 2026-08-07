import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';
import authRoutes from './authRoutes';
import academicProfileRoutes from './academicProfileRoutes';
import academicStructureRoutes from './academicStructureRoutes';
import documentRoutes from './documentRoutes';
import searchRoutes from './searchRoutes';
import timetableRoutes from './timetableRoutes';
import rgpdRoutes from './rgpdRoutes';
import versionRoutes from './versionRoutes';
import betaRoutes from './betaRoutes';
import feedbackRoutes from './feedbackRoutes';
import adminRoutes from './adminRoutes';

const router = Router();

// API Root Health Check
router.get('/health', getHealthStatus);

// Sub-routers
router.use('/auth', authRoutes);
router.use('/academic-profile', academicProfileRoutes);
router.use('/academic-structure', academicStructureRoutes);
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);
router.use('/timetable', timetableRoutes);
router.use('/rgpd', rgpdRoutes);
router.use('/user', rgpdRoutes); // Alias for RGPD user endpoints
router.use('/version', versionRoutes); // App version & changelog
router.use('/beta', betaRoutes); // Closed beta invitation & waitlist
router.use('/feedback', feedbackRoutes); // Feedback widget & submission
router.use('/admin', adminRoutes); // Admin beta metrics dashboard

export default router;
