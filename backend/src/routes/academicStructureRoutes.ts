import { Router } from 'express';
import { 
  getTree, 
  createUE, 
  updateUE, 
  deleteUE, 
  createECUE, 
  updateECUE, 
  deleteECUE, 
  createSubject, 
  updateSubject, 
  deleteSubject,
  importBatch,
  bulkImportStructure,
  reorderStructure,
  deleteAllStructure
} from '../controllers/academicStructureController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protect all academic structure routes with requireAuth
router.use(requireAuth);

// Tree, Reorder & Delete All Endpoints
router.get('/', getTree);
router.put('/reorder', reorderStructure);
router.delete('/all', deleteAllStructure);

// Bulk Import Endpoints
router.post('/import-batch', importBatch);
router.post('/bulk', bulkImportStructure);

// UE Endpoints
router.post('/ue', createUE);
router.put('/ue/:id', updateUE);
router.delete('/ue/:id', deleteUE);

// ECUE Endpoints
router.post('/ecue', createECUE);
router.put('/ecue/:id', updateECUE);
router.delete('/ecue/:id', deleteECUE);

// Subject Endpoints
router.post('/subject', createSubject);
router.put('/subject/:id', updateSubject);
router.delete('/subject/:id', deleteSubject);

export default router;

