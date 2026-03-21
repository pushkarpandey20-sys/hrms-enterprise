import { Router } from 'express';
import { employeeController } from '../controllers/employee.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import { upload, avatarUpload } from '../../../config/multer';

const router = Router();
router.use(authenticate);

router.get('/', employeeController.list);
router.get('/org-chart', employeeController.getOrgChart);
router.get('/export', authorize('HR_ADMIN', 'SUPER_ADMIN'), employeeController.exportExcel);
router.get('/:id', employeeController.getById);
router.post('/', authorize('HR_ADMIN', 'SUPER_ADMIN'), avatarUpload.single('photo'), employeeController.create);
router.put('/:id', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), avatarUpload.single('photo'), employeeController.update);
router.patch('/:id/status', authorize('HR_ADMIN', 'SUPER_ADMIN'), employeeController.updateStatus);
router.post('/bulk-import', authorize('HR_ADMIN', 'SUPER_ADMIN'), upload.single('file'), employeeController.bulkImport);

export default router;
