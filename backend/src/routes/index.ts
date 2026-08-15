import { Router } from 'express';
import { getHealthStatus } from '../controllers/healthController';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
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
import dashboardRoutes from './dashboardRoutes';
import favoriteRoutes from './favoriteRoutes';
import quickAccessRoutes from './quickAccessRoutes';
import tagRoutes from './tagRoutes';
import personalFolderRoutes from './personalFolderRoutes';
import aiRoutes from './aiRoutes';
import gradeRoutes from './gradeRoutes';

const router = Router();

// API Root Health Check
router.get('/health', getHealthStatus);

// Sub-routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/academic-profile', academicProfileRoutes);
router.use('/academic-structure', academicStructureRoutes);
router.use('/documents', documentRoutes);
router.use('/search', searchRoutes);
router.use('/timetable', timetableRoutes);
router.use('/ai', aiRoutes);
router.use('/grades', gradeRoutes);
router.use('/rgpd', rgpdRoutes);
router.use('/version', versionRoutes); // App version & changelog
router.use('/beta', betaRoutes); // Closed beta invitation & waitlist
router.use('/feedback', feedbackRoutes); // Feedback widget & submission
router.use('/admin', adminRoutes); // Admin beta metrics dashboard
router.use('/dashboard', dashboardRoutes); // Dashboard aggregated stats
router.use('/favorites', favoriteRoutes); // Favorite documents
router.use('/quick-access', quickAccessRoutes); // Quick access documents
router.use('/tags', tagRoutes); // User tags
router.use('/personal-folders', personalFolderRoutes); // Personal vault folders

export default router;
