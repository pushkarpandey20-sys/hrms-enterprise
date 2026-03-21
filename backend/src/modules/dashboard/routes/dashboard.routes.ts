import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../../../shared/middleware/authenticate';

const router = Router();
router.use(authenticate);
router.get('/hr', dashboardController.hr);
export default router;
