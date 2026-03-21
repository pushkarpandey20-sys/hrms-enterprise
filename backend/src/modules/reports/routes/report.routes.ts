import { Router } from 'express';
import { reportController } from '../controllers/report.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';

const router = Router();
router.use(authenticate, authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'));
router.get('/birthday-anniversary', reportController.birthdayAnniversary);
router.get('/document-expiry', reportController.documentExpiry);
router.get('/headcount', reportController.headcount);
export default router;
