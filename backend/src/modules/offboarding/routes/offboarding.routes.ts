import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import * as ctrl from '../controllers/offboarding.controller';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

router.post('/', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.initiateOffboarding);
router.get('/', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.listCases);
router.get('/:id', ctrl.getCase);
router.patch('/checklist/:itemId', ctrl.updateChecklistItem);
router.post('/:id/clearances', ctrl.signOffClearance);
router.get('/:id/fnf', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.getFnF);
router.post('/:id/exit-interview', ctrl.submitExitInterview);
router.post('/:id/complete', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.completeOffboarding);
router.post('/:id/cancel', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.cancelOffboarding);

export default router;
