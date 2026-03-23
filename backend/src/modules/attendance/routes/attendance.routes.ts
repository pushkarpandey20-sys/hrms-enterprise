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

// ─── WiFi Hotspot routes ──────────────────────────────────────────────────────
router.get('/hotspots', attendanceController.listHotspots);
router.post('/hotspots', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.createHotspot);
router.put('/hotspots/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.updateHotspot);
router.delete('/hotspots/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.deleteHotspot);
router.get('/employee/:employeeId/hotspots', attendanceController.getEmployeeHotspots);
router.post('/employee/:employeeId/hotspots/:hotspotId', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.assignHotspot);
router.delete('/employee/:employeeId/hotspots/:hotspotId', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.removeHotspot);

// ─── GeoFence routes ──────────────────────────────────────────────────────────
router.get('/geofences', attendanceController.listGeoFences);
router.post('/geofences', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.createGeoFence);
router.put('/geofences/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.updateGeoFence);
router.delete('/geofences/:id', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.deleteGeoFence);
router.post('/employee/:employeeId/geofences/:fenceId', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.assignGeoFence);
router.delete('/employee/:employeeId/geofences/:fenceId', authorize('HR_ADMIN', 'SUPER_ADMIN'), attendanceController.removeGeoFence);

export default router;
