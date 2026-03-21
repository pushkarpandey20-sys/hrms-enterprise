import { Router } from 'express';
import { announcementController } from '../controllers/announcement.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';

const router = Router();
router.use(authenticate);
router.get('/', announcementController.list);
router.post('/', authorize('HR_ADMIN', 'SUPER_ADMIN'), announcementController.create);
router.put('/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), announcementController.update);
router.delete('/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), announcementController.delete);
export default router;
