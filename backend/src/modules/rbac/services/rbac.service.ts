import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import ApiError from '../../../shared/utils/ApiError';
import { PermEffect, ScopeType, AccessReviewStatus, ReviewDecision } from '@prisma/client';

const PERM_CACHE_TTL = 300; // 5 minutes

// ─── Permission CRUD ─────────────────────────────────────────────────────────

export const createPermission = async (data: {
  action: string; resource: string; module: string; description?: string;
}) => {
  const key = `${data.module}:${data.resource}:${data.action}`;
  const existing = await prisma.permission.findUnique({ where: { key } });
  if (existing) throw ApiError.conflict(`Permission '${key}' already exists`);
  return prisma.permission.create({ data: { ...data, key } });
};

export const listPermissions = async (filters: { module?: string; resource?: string }) => {
  return prisma.permission.findMany({
    where: {
      ...(filters.module ? { module: filters.module } : {}),
      ...(filters.resource ? { resource: filters.resource } : {}),
    },
    orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }],
  });
};

export const deletePermission = async (permissionId: string) => {
  await prisma.permission.delete({ where: { id: permissionId } });
  // Flush permission caches
  const keys = await redis.keys('perm:*');
  if (keys.length) await redis.del(...keys);
};

// ─── Role CRUD ────────────────────────────────────────────────────────────────

export const createRole = async (orgId: string, data: {
  name: string; description?: string; permissionIds: string[];
}) => {
  const slug = data.name.toLowerCase().replace(/\s+/g, '-');
  return prisma.role.create({
    data: {
      name: data.name,
      slug,
      description: data.description,
      organizationId: orgId,
      permissions: {
        create: data.permissionIds.map(pid => ({ permissionId: pid })),
      },
    },
    include: { permissions: { include: { permission: true } } },
  });
};

export const updateRole = async (roleId: string, orgId: string, data: {
  name?: string; description?: string; permissionIds?: string[];
}) => {
  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: orgId } });
  if (!role) throw ApiError.notFound('Role not found');

  if (data.permissionIds) {
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.rolePermission.createMany({
      data: data.permissionIds.map(pid => ({ roleId, permissionId: pid })),
    });
    // Flush related caches
    const keys = await redis.keys('perm:*');
    if (keys.length) await redis.del(...keys);
  }

  return prisma.role.update({
    where: { id: roleId },
    data: { name: data.name, description: data.description },
    include: { permissions: { include: { permission: true } } },
  });
};

export const listRoles = async (orgId: string) => {
  return prisma.role.findMany({
    where: { organizationId: orgId },
    include: {
      permissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
    orderBy: { name: 'asc' },
  });
};

export const deleteRole = async (roleId: string, orgId: string) => {
  const role = await prisma.role.findFirst({ where: { id: roleId, organizationId: orgId } });
  if (!role) throw ApiError.notFound('Role not found');
  if (role.isSystem) throw ApiError.forbidden('Cannot delete system roles');
  await prisma.role.delete({ where: { id: roleId } });
  const keys = await redis.keys('perm:*');
  if (keys.length) await redis.del(...keys);
};

// ─── User Role Assignment ─────────────────────────────────────────────────────

export const assignRoleToUser = async (data: {
  userId: string; roleId: string; orgId: string;
  scopeType?: ScopeType; scopeId?: string;
  expiresAt?: Date; grantedById: string;
}) => {
  // Verify role belongs to org
  const role = await prisma.role.findFirst({
    where: { id: data.roleId, organizationId: data.orgId },
  });
  if (!role) throw ApiError.notFound('Role not found in this organization');

  const assignment = await prisma.userRole_.upsert({
    where: {
      userId_roleId_scopeType_scopeId: {
        userId: data.userId,
        roleId: data.roleId,
        scopeType: data.scopeType ?? ScopeType.GLOBAL,
        scopeId: data.scopeId ?? '',
      },
    },
    create: {
      userId: data.userId,
      roleId: data.roleId,
      scopeType: data.scopeType ?? ScopeType.GLOBAL,
      scopeId: data.scopeId ?? '',
      expiresAt: data.expiresAt,
      grantedById: data.grantedById,
    },
    update: { expiresAt: data.expiresAt, isActive: true },
    include: { role: true },
  });

  await invalidateUserPermCache(data.userId);
  return assignment;
};

export const revokeRoleFromUser = async (userRoleId: string, orgId: string) => {
  const ur = await prisma.userRole_.findUnique({
    where: { id: userRoleId },
    include: { role: { select: { organizationId: true } } },
  });
  if (!ur || ur.role.organizationId !== orgId) throw ApiError.notFound('Assignment not found');

  await prisma.userRole_.update({ where: { id: userRoleId }, data: { isActive: false } });
  await invalidateUserPermCache(ur.userId);
};

export const listUserRoles = async (userId: string, orgId: string) => {
  return prisma.userRole_.findMany({
    where: {
      userId,
      isActive: true,
      role: { organizationId: orgId },
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      role: { include: { permissions: { include: { permission: true } } } },
    },
  });
};

// ─── Per-User Permission Overrides ────────────────────────────────────────────

export const setPermissionOverride = async (data: {
  userId: string; permissionId: string; orgId: string;
  effect: PermEffect; reason?: string;
  scopeType?: ScopeType; scopeId?: string;
  expiresAt?: Date; grantedById: string;
}) => {
  const override = await prisma.userPermissionOverride.upsert({
    where: {
      userId_permissionId_scopeType_scopeId: {
        userId: data.userId,
        permissionId: data.permissionId,
        scopeType: data.scopeType ?? ScopeType.GLOBAL,
        scopeId: data.scopeId ?? '',
      },
    },
    create: {
      userId: data.userId,
      permissionId: data.permissionId,
      effect: data.effect,
      reason: data.reason,
      scopeType: data.scopeType ?? ScopeType.GLOBAL,
      scopeId: data.scopeId ?? '',
      expiresAt: data.expiresAt,
      grantedById: data.grantedById,
    },
    update: { effect: data.effect, reason: data.reason, expiresAt: data.expiresAt },
  });

  await invalidateUserPermCache(data.userId);
  return override;
};

export const removePermissionOverride = async (overrideId: string, orgId: string) => {
  await prisma.userPermissionOverride.delete({ where: { id: overrideId } });
  // We don't have orgId on override directly, flush all
  const keys = await redis.keys('perm:*');
  if (keys.length) await redis.del(...keys);
};

// ─── Effective Permission Resolution ─────────────────────────────────────────

export const resolveUserPermissions = async (
  userId: string,
  orgId: string,
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<Set<string>> => {
  const cacheKey = `perm:${userId}:${scopeType ?? 'GLOBAL'}:${scopeId ?? ''}`;
  const cached = await redis.get(cacheKey);
  if (cached) return new Set(JSON.parse(cached));

  const now = new Date();

  // 1. Collect all active role assignments
  const userRoles = await prisma.userRole_.findMany({
    where: {
      userId,
      isActive: true,
      role: { organizationId: orgId },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { scopeType: ScopeType.GLOBAL },
            ...(scopeType ? [{ scopeType, scopeId: scopeId ?? '' }] : []),
          ],
        },
      ],
    },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  });

  // 2. Union all permissions from all roles
  const granted = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.permissions) {
      granted.add(rp.permission.key);
    }
  }

  // 3. Apply per-user overrides (DENY wins over GRANT)
  const overrides = await prisma.userPermissionOverride.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      AND: [
        {
          OR: [
            { scopeType: ScopeType.GLOBAL },
            ...(scopeType ? [{ scopeType, scopeId: scopeId ?? '' }] : []),
          ],
        },
      ],
    },
    include: { permission: true },
  });

  for (const o of overrides) {
    if (o.effect === PermEffect.GRANT) {
      granted.add(o.permission.key);
    } else {
      granted.delete(o.permission.key);
    }
  }

  await redis.setex(cacheKey, PERM_CACHE_TTL, JSON.stringify([...granted]));
  return granted;
};

export const checkPermission = async (
  userId: string,
  orgId: string,
  permKey: string,
  scopeType?: ScopeType,
  scopeId?: string,
): Promise<boolean> => {
  const perms = await resolveUserPermissions(userId, orgId, scopeType, scopeId);
  return perms.has(permKey);
};

// ─── Permission Matrix ────────────────────────────────────────────────────────

export const getPermissionMatrix = async (orgId: string) => {
  const [users, permissions, roles] = await Promise.all([
    prisma.user_.findMany({
      where: { organizationId: orgId, isActive: true },
      include: {
        userRoles: {
          where: {
            isActive: true,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
        permissionOverrides: {
          where: { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          include: { permission: true },
        },
      },
      take: 50,
    }),
    prisma.permission.findMany({ orderBy: [{ module: 'asc' }, { resource: 'asc' }, { action: 'asc' }] }),
    prisma.role.findMany({
      where: { organizationId: orgId },
      include: { permissions: { include: { permission: true } } },
    }),
  ]);

  const matrix = users.map(u => {
    const granted = new Set<string>();
    const denied = new Set<string>();

    for (const ur of u.userRoles) {
      for (const rp of ur.role.permissions) granted.add(rp.permission.key);
    }

    for (const ov of u.permissionOverrides) {
      if (ov.effect === PermEffect.GRANT) granted.add(ov.permission.key);
      else denied.add(ov.permission.key);
    }

    for (const k of denied) granted.delete(k);

    return {
      userId: u.id,
      displayName: u.displayName,
      email: u.email,
      permissions: [...granted],
      roleCount: u.userRoles.length,
    };
  });

  return { matrix, permissions, roles };
};

// ─── Access Review Workflows ──────────────────────────────────────────────────

export const createAccessReview = async (orgId: string, data: {
  title: string; dueDate: Date; reviewerIds: string[];
  targetUserIds: string[]; initiatedById: string;
}) => {
  return prisma.accessReview.create({
    data: {
      title: data.title,
      organizationId: orgId,
      dueDate: data.dueDate,
      initiatedById: data.initiatedById,
      assignments: {
        create: data.targetUserIds.flatMap(uid =>
          data.reviewerIds.map(rid => ({
            reviewerId: rid,
            targetUserId: uid,
          }))
        ),
      },
    },
    include: { assignments: true },
  });
};

export const listAccessReviews = async (orgId: string) => {
  return prisma.accessReview.findMany({
    where: { organizationId: orgId },
    include: {
      _count: { select: { assignments: true } },
      initiatedBy: { select: { displayName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const submitReviewDecision = async (assignmentId: string, reviewerId: string, data: {
  decision: ReviewDecision; notes?: string;
}) => {
  const assignment = await prisma.accessReviewAssignment.findFirst({
    where: { id: assignmentId, reviewerId },
  });
  if (!assignment) throw ApiError.notFound('Review assignment not found');

  const updated = await prisma.accessReviewAssignment.update({
    where: { id: assignmentId },
    data: {
      decision: data.decision,
      notes: data.notes,
      decidedAt: new Date(),
    },
  });

  // If REVOKE decision, revoke all roles for target user
  if (data.decision === ReviewDecision.REVOKE) {
    await prisma.userRole_.updateMany({
      where: { userId: assignment.targetUserId, isActive: true },
      data: { isActive: false },
    });
    await invalidateUserPermCache(assignment.targetUserId);
  }

  return updated;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const invalidateUserPermCache = async (userId: string) => {
  const keys = await redis.keys(`perm:${userId}:*`);
  if (keys.length) await redis.del(...keys);
};

export const seedDefaultPermissions = async () => {
  const defaultPerms = [
    // Employees
    { module: 'employees', resource: 'employee', action: 'read' },
    { module: 'employees', resource: 'employee', action: 'create' },
    { module: 'employees', resource: 'employee', action: 'update' },
    { module: 'employees', resource: 'employee', action: 'delete' },
    // Attendance
    { module: 'attendance', resource: 'record', action: 'read' },
    { module: 'attendance', resource: 'record', action: 'create' },
    { module: 'attendance', resource: 'record', action: 'approve' },
    // Leave
    { module: 'leave', resource: 'request', action: 'read' },
    { module: 'leave', resource: 'request', action: 'create' },
    { module: 'leave', resource: 'request', action: 'approve' },
    // Payroll
    { module: 'payroll', resource: 'run', action: 'read' },
    { module: 'payroll', resource: 'run', action: 'create' },
    { module: 'payroll', resource: 'run', action: 'approve' },
    // Assets
    { module: 'assets', resource: 'asset', action: 'read' },
    { module: 'assets', resource: 'asset', action: 'create' },
    { module: 'assets', resource: 'asset', action: 'update' },
    { module: 'assets', resource: 'asset', action: 'assign' },
    // Reports
    { module: 'reports', resource: 'report', action: 'read' },
    { module: 'reports', resource: 'report', action: 'export' },
    // RBAC
    { module: 'rbac', resource: 'role', action: 'read' },
    { module: 'rbac', resource: 'role', action: 'create' },
    { module: 'rbac', resource: 'role', action: 'update' },
    { module: 'rbac', resource: 'role', action: 'delete' },
    { module: 'rbac', resource: 'permission', action: 'assign' },
  ];

  for (const p of defaultPerms) {
    const key = `${p.module}:${p.resource}:${p.action}`;
    await prisma.permission.upsert({
      where: { key },
      create: { ...p, key },
      update: {},
    });
  }
};
