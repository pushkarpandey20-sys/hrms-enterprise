import { Router } from 'express';
import { authenticate, authorize } from '../../../shared/middleware/authenticate';
import * as ctrl from '../controllers/rbac.controller';
import { UserRole } from '@prisma/client';

const router = Router();
router.use(authenticate);

// Permissions
router.get('/permissions', ctrl.listPermissions);
router.post('/permissions', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.createPermission);
router.delete('/permissions/:id', authorize(UserRole.SUPER_ADMIN), ctrl.deletePermission);
router.post('/permissions/seed', authorize(UserRole.SUPER_ADMIN), ctrl.seedPermissions);

// Roles
router.get('/roles', ctrl.listRoles);
router.post('/roles', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.createRole);
router.put('/roles/:id', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.updateRole);
router.delete('/roles/:id', authorize(UserRole.SUPER_ADMIN), ctrl.deleteRole);

// User Role Assignments
router.post('/assignments', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.assignRole);
router.delete('/assignments/:id', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.revokeRole);
router.get('/users/:userId/roles', ctrl.getUserRoles);

// Per-user Overrides
router.post('/overrides', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.setOverride);
router.delete('/overrides/:id', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.removeOverride);

// Permission Matrix
router.get('/matrix', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.getMatrix);

// My Permissions
router.get('/me/permissions', ctrl.getMyPermissions);

// Access Reviews
router.get('/reviews', ctrl.listReviews);
router.post('/reviews', authorize(UserRole.SUPER_ADMIN, UserRole.ADMIN), ctrl.createReview);
router.post('/reviews/assignments/:assignmentId/decision', ctrl.submitDecision);

export default router;
