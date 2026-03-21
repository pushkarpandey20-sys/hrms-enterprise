import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { authenticate } from '../../../shared/middleware/authenticate';

const router = Router();
router.use(authenticate);
router.get('/', notificationController.list);
router.get('/unread', notificationController.unread);
router.patch('/:id/read', notificationController.markRead);
router.patch('/read-all', notificationController.markAllRead);
export default router;
