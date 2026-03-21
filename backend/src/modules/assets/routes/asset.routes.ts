import { Router } from 'express';
import { assetController } from '../controllers/asset.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import { upload } from '../../../config/multer';

const router = Router();
router.use(authenticate);

router.get('/categories', assetController.getCategories);
router.get('/export', authorize('HR_ADMIN', 'SUPER_ADMIN'), assetController.exportRegister);
router.get('/', assetController.list);
router.get('/:id', assetController.getById);
router.post('/', authorize('HR_ADMIN', 'SUPER_ADMIN'), assetController.create);
router.put('/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), assetController.update);
router.post('/:id/assign', authorize('HR_ADMIN', 'SUPER_ADMIN'), assetController.assign);
router.post('/assignments/:assignmentId/return', authorize('HR_ADMIN', 'SUPER_ADMIN'), assetController.returnAsset);
router.post('/bulk-import', authorize('HR_ADMIN', 'SUPER_ADMIN'), upload.single('file'), assetController.bulkImport);

export default router;
