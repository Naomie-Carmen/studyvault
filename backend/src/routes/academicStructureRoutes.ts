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
  importBatch
} from '../controllers/academicStructureController';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();

// Protect all academic structure routes with requireAuth
router.use(requireAuth);

// Tree Endpoint
router.get('/', getTree);

// Bulk Import Endpoint
router.post('/import-batch', importBatch);

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

