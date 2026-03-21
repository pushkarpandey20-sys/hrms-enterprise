import { Router } from 'express';
import { leaveController } from '../controllers/leave.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import { upload } from '../../../config/multer';

const router = Router();
router.use(authenticate);

router.get('/types', leaveController.getLeaveTypes);
router.get('/holidays', leaveController.getHolidays);
router.get('/my', leaveController.getMyLeaves);
router.get('/balances', leaveController.getBalances);
router.get('/balances/:employeeId', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), leaveController.getBalances);
router.post('/apply', upload.single('attachment'), leaveController.apply);
router.post('/:id/process', leaveController.process);
router.get('/pending', leaveController.getPendingApprovals);
router.get('/calendar', leaveController.teamCalendar);
router.get('/export', authorize('HR_ADMIN', 'SUPER_ADMIN'), leaveController.exportReport);

export default router;
