import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import * as ctrl from '../controllers/performance.controller';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Review Cycles
router.get('/cycles', ctrl.listCycles);
router.post('/cycles', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.createCycle);
router.patch('/cycles/:id/status', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.updateCycleStatus);

// Goals
router.get('/goals/me', ctrl.getMyGoals);
router.post('/goals', ctrl.createGoal);
router.patch('/goals/:id/progress', ctrl.updateGoalProgress);
router.get('/employees/:employeeId/goals', ctrl.getEmployeeGoals);

// Reviews
router.post('/cycles/:cycleId/reviews', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.initiateReview);
router.get('/cycles/:cycleId/reviews', ctrl.getCycleReviews);
router.patch('/reviews/:id/submit', ctrl.submitReview);
router.get('/cycles/:cycleId/bonus', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER), ctrl.calculateBonus);

// 360 Feedback
router.post('/feedback', ctrl.requestFeedback);
router.patch('/feedback/:id/submit', ctrl.submitFeedback);
router.get('/feedback/me', ctrl.getMyFeedback);

// PIP
router.post('/pip', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.HR_MANAGER, UserRole.MANAGER), ctrl.createPIP);
router.post('/pip/:pipId/checkins', ctrl.addCheckIn);
router.patch('/pip/:pipId/close', ctrl.closePIP);
router.get('/employees/:employeeId/pip', ctrl.getEmployeePIPs);

export default router;
