import { prisma } from '../../../config/database';
import { cloudinary } from '../../../config/cloudinary';
import ApiError from '../../../shared/utils/ApiError';
import { RepairStatus, RepairPriority, RepairCategory } from '@prisma/client';
import { emitToOrg } from '../../../sockets/socketServer';

// SLA hours by priority
const SLA_HOURS: Record<RepairPriority, number> = {
  CRITICAL: 4,
  HIGH: 24,
  MEDIUM: 72,
  LOW: 168,
};

// Valid next stages in workflow
const NEXT_STAGES: Partial<Record<RepairStatus, RepairStatus[]>> = {
  SUBMITTED:       [RepairStatus.UNDER_REVIEW, RepairStatus.REJECTED],
  UNDER_REVIEW:    [RepairStatus.APPROVED, RepairStatus.REJECTED],
  APPROVED:        [RepairStatus.VENDOR_ASSIGNED, RepairStatus.IN_REPAIR],
  VENDOR_ASSIGNED: [RepairStatus.IN_REPAIR],
  IN_REPAIR:       [RepairStatus.QC_CHECK],
  QC_CHECK:        [RepairStatus.REPAIRED, RepairStatus.IN_REPAIR],
  REPAIRED:        [RepairStatus.RETURNED],
  RETURNED:        [RepairStatus.CLOSED],
};

export const createRepairTicket = async (orgId: string, requestedById: string, data: {
  assetId: string;
  priority: RepairPriority;
  category: RepairCategory;
  description: string;
  estimatedCost?: number;
  photos?: string[]; // base64 or URLs
}) => {
  // Verify asset belongs to org
  const asset = await prisma.asset.findFirst({
    where: { id: data.assetId, organizationId: orgId },
  });
  if (!asset) throw ApiError.notFound('Asset not found');

  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + SLA_HOURS[data.priority]);

  // Upload photos to Cloudinary if provided
  const photoUrls: string[] = [];
  if (data.photos && data.photos.length > 0) {
    for (const photo of data.photos.slice(0, 5)) {
      try {
        const result = await cloudinary.uploader.upload(photo, {
          folder: `hrms/repairs/${orgId}`,
        });
        photoUrls.push(result.secure_url);
      } catch {}
    }
  }

  const ticket = await prisma.repairTicket.create({
    data: {
      assetId: data.assetId,
      organizationId: orgId,
      requestedById,
      priority: data.priority,
      category: data.category,
      description: data.description,
      estimatedCost: data.estimatedCost,
      slaDeadline,
      timeline: {
        create: {
          status: RepairStatus.SUBMITTED,
          notes: 'Ticket submitted',
          changedById: requestedById,
        },
      },
      photos: photoUrls.length > 0
        ? { create: photoUrls.map(url => ({ url })) }
        : undefined,
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      requestedBy: { select: { displayName: true, email: true } },
      photos: true,
    },
  });

  emitToOrg(orgId, 'repair:created', { ticketId: ticket.id, asset: ticket.asset.name });
  return ticket;
};

export const getRepairTickets = async (orgId: string, filters: {
  status?: RepairStatus;
  priority?: RepairPriority;
  assignedToId?: string;
  page?: number;
  pageSize?: number;
}) => {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const [tickets, total] = await Promise.all([
    prisma.repairTicket.findMany({
      where: {
        organizationId: orgId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.priority ? { priority: filters.priority } : {}),
        ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      },
      include: {
        asset: { select: { name: true, assetTag: true, category: { select: { name: true } } } },
        requestedBy: { select: { displayName: true, email: true } },
        assignedTo: { select: { displayName: true, email: true } },
        _count: { select: { comments: true, photos: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.repairTicket.count({ where: { organizationId: orgId } }),
  ]);

  return { tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

export const getRepairTicketById = async (ticketId: string, orgId: string) => {
  const ticket = await prisma.repairTicket.findFirst({
    where: { id: ticketId, organizationId: orgId },
    include: {
      asset: true,
      requestedBy: { select: { displayName: true, email: true } },
      assignedTo: { select: { displayName: true, email: true } },
      loanerAsset: { select: { name: true, assetTag: true } },
      photos: true,
      timeline: {
        include: { changedBy: { select: { displayName: true } } },
        orderBy: { createdAt: 'asc' },
      },
      comments: {
        include: { author: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!ticket) throw ApiError.notFound('Repair ticket not found');
  return ticket;
};

export const advanceStage = async (
  ticketId: string,
  orgId: string,
  userId: string,
  data: {
    newStatus: RepairStatus;
    notes?: string;
    actualCost?: number;
    vendorName?: string;
    assignedToId?: string;
    loanerAssetId?: string;
  },
) => {
  const ticket = await prisma.repairTicket.findFirst({
    where: { id: ticketId, organizationId: orgId },
  });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  const allowed = NEXT_STAGES[ticket.status] ?? [];
  if (!allowed.includes(data.newStatus)) {
    throw ApiError.badRequest(
      `Cannot transition from ${ticket.status} to ${data.newStatus}. Allowed: ${allowed.join(', ')}`
    );
  }

  const isSlaBreached = ticket.slaDeadline && new Date() > ticket.slaDeadline;

  const updated = await prisma.repairTicket.update({
    where: { id: ticketId },
    data: {
      status: data.newStatus,
      ...(data.actualCost !== undefined ? { actualCost: data.actualCost } : {}),
      ...(data.vendorName ? { vendorName: data.vendorName } : {}),
      ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
      ...(data.loanerAssetId ? { loanerAssetId: data.loanerAssetId } : {}),
      ...(data.newStatus === RepairStatus.CLOSED ? { closedAt: new Date() } : {}),
      ...(data.newStatus === RepairStatus.REPAIRED ? { repairedAt: new Date() } : {}),
      isSlaBreached: isSlaBreached ?? false,
      timeline: {
        create: {
          status: data.newStatus,
          notes: data.notes,
          changedById: userId,
        },
      },
    },
    include: {
      asset: { select: { name: true, assetTag: true } },
      requestedBy: { select: { displayName: true, email: true } },
    },
  });

  // Assign loaner asset
  if (data.loanerAssetId) {
    await prisma.asset.update({
      where: { id: data.loanerAssetId },
      data: { status: 'ASSIGNED' },
    });
  }

  emitToOrg(orgId, 'repair:statusUpdated', {
    ticketId,
    newStatus: data.newStatus,
    asset: updated.asset.name,
  });

  return updated;
};

export const addComment = async (
  ticketId: string, orgId: string, authorId: string,
  content: string, isInternal: boolean = false,
) => {
  const ticket = await prisma.repairTicket.findFirst({ where: { id: ticketId, organizationId: orgId } });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  return prisma.repairComment.create({
    data: { ticketId, authorId, content, isInternal },
    include: { author: { select: { displayName: true, email: true } } },
  });
};

export const submitCsat = async (ticketId: string, orgId: string, userId: string, rating: number, feedback?: string) => {
  const ticket = await prisma.repairTicket.findFirst({
    where: { id: ticketId, organizationId: orgId, requestedById: userId, status: RepairStatus.CLOSED },
  });
  if (!ticket) throw ApiError.notFound('Closed ticket not found or not yours');

  return prisma.repairTicket.update({
    where: { id: ticketId },
    data: { csatRating: rating, csatFeedback: feedback },
  });
};

export const getRepairAnalytics = async (orgId: string, from?: Date, to?: Date) => {
  const dateFilter = {
    ...(from ? { gte: from } : {}),
    ...(to ? { lte: to } : {}),
  };

  const [byStatus, byCategory, byPriority, totalCost, slaStats] = await Promise.all([
    prisma.repairTicket.groupBy({
      by: ['status'],
      where: { organizationId: orgId, createdAt: dateFilter },
      _count: true,
    }),
    prisma.repairTicket.groupBy({
      by: ['category'],
      where: { organizationId: orgId, createdAt: dateFilter },
      _count: true,
      _sum: { actualCost: true },
    }),
    prisma.repairTicket.groupBy({
      by: ['priority'],
      where: { organizationId: orgId, createdAt: dateFilter },
      _count: true,
    }),
    prisma.repairTicket.aggregate({
      where: { organizationId: orgId, createdAt: dateFilter },
      _sum: { actualCost: true, estimatedCost: true },
      _avg: { csatRating: true },
    }),
    prisma.repairTicket.aggregate({
      where: { organizationId: orgId, isSlaBreached: true, createdAt: dateFilter },
      _count: true,
    }),
  ]);

  return { byStatus, byCategory, byPriority, totalCost, slaBreaches: slaStats._count };
};
