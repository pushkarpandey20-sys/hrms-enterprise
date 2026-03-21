import { Request, Response, NextFunction } from 'express';
import * as rbacService from '../services/rbac.service';
import { z } from 'zod';

const createPermissionSchema = z.object({
  action: z.string().min(1),
  resource: z.string().min(1),
  module: z.string().min(1),
  description: z.string().optional(),
});

const createRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()),
});

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  roleId: z.string().uuid(),
  scopeType: z.enum(['GLOBAL', 'DEPARTMENT', 'BRANCH']).optional(),
  scopeId: z.string().optional(),
  expiresAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});

const overrideSchema = z.object({
  userId: z.string().uuid(),
  permissionId: z.string().uuid(),
  effect: z.enum(['GRANT', 'DENY']),
  reason: z.string().optional(),
  scopeType: z.enum(['GLOBAL', 'DEPARTMENT', 'BRANCH']).optional(),
  scopeId: z.string().optional(),
  expiresAt: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
});

const reviewSchema = z.object({
  title: z.string().min(1),
  dueDate: z.string().datetime().transform(v => new Date(v)),
  reviewerIds: z.array(z.string().uuid()).min(1),
  targetUserIds: z.array(z.string().uuid()).min(1),
});

// Permissions
export const createPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createPermissionSchema.parse(req.body);
    const perm = await rbacService.createPermission(data);
    res.status(201).json({ success: true, data: perm });
  } catch (e) { next(e); }
};

export const listPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { module, resource } = req.query as Record<string, string>;
    const perms = await rbacService.listPermissions({ module, resource });
    res.json({ success: true, data: perms });
  } catch (e) { next(e); }
};

export const deletePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rbacService.deletePermission(req.params.id);
    res.json({ success: true, message: 'Permission deleted' });
  } catch (e) { next(e); }
};

// Roles
export const createRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createRoleSchema.parse(req.body);
    const role = await rbacService.createRole(req.user!.organizationId, data);
    res.status(201).json({ success: true, data: role });
  } catch (e) { next(e); }
};

export const updateRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const role = await rbacService.updateRole(req.params.id, req.user!.organizationId, req.body);
    res.json({ success: true, data: role });
  } catch (e) { next(e); }
};

export const listRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await rbacService.listRoles(req.user!.organizationId);
    res.json({ success: true, data: roles });
  } catch (e) { next(e); }
};

export const deleteRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rbacService.deleteRole(req.params.id, req.user!.organizationId);
    res.json({ success: true, message: 'Role deleted' });
  } catch (e) { next(e); }
};

// User Role Assignments
export const assignRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = assignRoleSchema.parse(req.body);
    const result = await rbacService.assignRoleToUser({
      ...data,
      orgId: req.user!.organizationId,
      grantedById: req.user!.userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const revokeRole = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rbacService.revokeRoleFromUser(req.params.id, req.user!.organizationId);
    res.json({ success: true, message: 'Role revoked' });
  } catch (e) { next(e); }
};

export const getUserRoles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const roles = await rbacService.listUserRoles(req.params.userId, req.user!.organizationId);
    res.json({ success: true, data: roles });
  } catch (e) { next(e); }
};

// Permission Overrides
export const setOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = overrideSchema.parse(req.body);
    const result = await rbacService.setPermissionOverride({
      ...data,
      orgId: req.user!.organizationId,
      grantedById: req.user!.userId,
    });
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const removeOverride = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rbacService.removePermissionOverride(req.params.id, req.user!.organizationId);
    res.json({ success: true, message: 'Override removed' });
  } catch (e) { next(e); }
};

// Permission Matrix
export const getMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matrix = await rbacService.getPermissionMatrix(req.user!.organizationId);
    res.json({ success: true, data: matrix });
  } catch (e) { next(e); }
};

// My Permissions
export const getMyPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const perms = await rbacService.resolveUserPermissions(
      req.user!.userId, req.user!.organizationId
    );
    res.json({ success: true, data: [...perms] });
  } catch (e) { next(e); }
};

// Access Reviews
export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = reviewSchema.parse(req.body);
    const review = await rbacService.createAccessReview(req.user!.organizationId, {
      ...data,
      initiatedById: req.user!.userId,
    });
    res.status(201).json({ success: true, data: review });
  } catch (e) { next(e); }
};

export const listReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await rbacService.listAccessReviews(req.user!.organizationId);
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
};

export const submitDecision = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { decision, notes } = req.body;
    const result = await rbacService.submitReviewDecision(
      req.params.assignmentId, req.user!.userId, { decision, notes }
    );
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const seedPermissions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await rbacService.seedDefaultPermissions();
    res.json({ success: true, message: 'Default permissions seeded' });
  } catch (e) { next(e); }
};
