import { Router } from 'express';
import { 
  uploadFiles, 
  listDocuments, 
  getDocument, 
  previewFile, 
  downloadFile, 
  updateDocument, 
  softDeleteDocument, 
  restoreDocument, 
  listTrash, 
  permanentlyDeleteDocument, 
  emptyTrash, 
  getQuota,
  recordView,
  getRecentlyViewed,
  getMetadata,
  getClassification,
  acceptClassification,
  modifyClassification,
  rejectClassification,
  listUnclassified
} from '../controllers/documentController';
import { requireAuth } from '../middleware/authMiddleware';
import { uploadMiddleware } from '../middleware/fileUploadMiddleware';

const router = Router();

// Require authentication for all document management endpoints
router.use(requireAuth);

// Document Endpoints
router.post('/upload', uploadMiddleware.array('files', 10), uploadFiles);
router.get('/', listDocuments);
router.get('/quota', getQuota);
router.get('/trash', listTrash);
router.post('/trash/empty', emptyTrash);
router.delete('/trash/:id', permanentlyDeleteDocument);
router.get('/recently-viewed', getRecentlyViewed);
router.get('/unclassified', listUnclassified);

router.get('/:id', getDocument);
router.get('/:id/preview', previewFile);
router.get('/:id/download', downloadFile);
router.get('/:id/metadata', getMetadata);
router.post('/:id/views', recordView);
router.patch('/:id', updateDocument);
router.delete('/:id', softDeleteDocument);
router.post('/:id/restore', restoreDocument);

// Phase 10 Classification Endpoints
router.get('/:id/classification', getClassification);
router.post('/:id/classification/accept', acceptClassification);
router.post('/:id/classification/modify', modifyClassification);
router.post('/:id/classification/reject', rejectClassification);

export default router;
