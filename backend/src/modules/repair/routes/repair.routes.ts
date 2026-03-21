import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import * as ctrl from '../controllers/repair.controller';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.post('/', ctrl.createTicket);
router.get('/', ctrl.listTickets);
router.get('/analytics', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.getAnalytics);
router.get('/:id', ctrl.getTicket);
router.patch('/:id/stage', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.advanceStage);
router.post('/:id/comments', ctrl.addComment);
router.post('/:id/csat', ctrl.submitCsat);

export default router;
