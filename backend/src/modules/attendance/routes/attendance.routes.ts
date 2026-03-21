import { Router } from 'express';
import { attendanceController } from '../controllers/attendance.controller';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import { upload, avatarUpload } from '../../../config/multer';

const router = Router();
router.use(authenticate);

router.post('/clock-in', avatarUpload.single('selfie'), attendanceController.clockIn);
router.post('/clock-out', avatarUpload.single('selfie'), attendanceController.clockOut);
router.get('/my', attendanceController.getMyAttendance);
router.get('/dashboard', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), attendanceController.dashboard);
router.get('/employee/:employeeId', authorize('HR_ADMIN', 'SUPER_ADMIN', 'MANAGER'), attendanceController.getEmployeeAttendance);
router.post('/override', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.adminOverride);
router.get('/export', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.exportRegister);
router.post('/bulk-upload', authorize('HR_ADMIN', 'SUPER_ADMIN'), upload.single('file'), attendanceController.bulkUpload);

export default router;
