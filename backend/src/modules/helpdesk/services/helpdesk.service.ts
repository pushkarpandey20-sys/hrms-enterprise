import { prisma } from '../../../config/database';
import ApiError from '../../../shared/utils/ApiError';
import { TicketStatus, TicketPriority, TicketType } from '@prisma/client';
import { emitToOrg } from '../../../sockets/socketServer';

const SLA_HOURS: Record<TicketPriority, number> = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const createCategory = async (orgId: string, data: {
  name: string; type: TicketType; description?: string;
  slaHours?: number; assignedTeamId?: string;
}) => {
  return prisma.helpdeskCategory.create({
    data: { ...data, organizationId: orgId },
  });
};

export const listCategories = async (orgId: string, type?: TicketType) => {
  return prisma.helpdeskCategory.findMany({
    where: { organizationId: orgId, isActive: true, ...(type ? { type } : {}) },
    include: { _count: { select: { tickets: true } } },
    orderBy: { name: 'asc' },
  });
};

// ─── Tickets ─────────────────────────────────────────────────────────────────

export const createTicket = async (orgId: string, requestedById: string, data: {
  categoryId: string;
  subject: string; description: string;
  priority: TicketPriority;
  attachments?: string[];
  tags?: string[];
}) => {
  const category = await prisma.helpdeskCategory.findFirst({
    where: { id: data.categoryId, organizationId: orgId },
  });
  if (!category) throw ApiError.notFound('Category not found');

  const slaHours = category.slaHours ?? SLA_HOURS[data.priority];
  const slaDeadline = new Date();
  slaDeadline.setHours(slaDeadline.getHours() + slaHours);

  // Auto-assign to team if category has one
  const assignedToId = category.assignedTeamId ?? undefined;

  const ticket = await prisma.helpdeskTicket.create({
    data: {
      organizationId: orgId,
      requestedById,
      categoryId: data.categoryId,
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      type: category.type,
      slaDeadline,
      assignedToId,
      attachments: data.attachments
        ? {
            create: data.attachments.map(url => ({ url, fileName: url.split('/').pop() ?? 'file' })),
          }
        : undefined,
      tags: data.tags
        ? {
            connectOrCreate: data.tags.map(tag => ({
              where: { name_orgId: { name: tag, orgId } },
              create: { name: tag, orgId },
            })),
          }
        : undefined,
    },
    include: {
      category: true,
      requestedBy: { select: { displayName: true, email: true } },
    },
  });

  emitToOrg(orgId, 'helpdesk:ticketCreated', { ticketId: ticket.id, subject: ticket.subject });
  return ticket;
};

export const listTickets = async (orgId: string, filters: {
  status?: TicketStatus;
  priority?: TicketPriority;
  type?: TicketType;
  assignedToId?: string;
  requestedById?: string;
  page?: number; pageSize?: number;
}) => {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const where: any = {
    organizationId: orgId,
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.assignedToId ? { assignedToId: filters.assignedToId } : {}),
    ...(filters.requestedById ? { requestedById: filters.requestedById } : {}),
  };

  const [tickets, total] = await Promise.all([
    prisma.helpdeskTicket.findMany({
      where,
      include: {
        category: { select: { name: true, type: true } },
        requestedBy: { select: { displayName: true, email: true } },
        assignedTo: { select: { displayName: true, email: true } },
        _count: { select: { comments: true, attachments: true } },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.helpdeskTicket.count({ where }),
  ]);

  return { tickets, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

export const getTicketById = async (ticketId: string, orgId: string) => {
  const ticket = await prisma.helpdeskTicket.findFirst({
    where: { id: ticketId, organizationId: orgId },
    include: {
      category: true,
      requestedBy: { select: { displayName: true, email: true } },
      assignedTo: { select: { displayName: true, email: true } },
      attachments: true,
      tags: true,
      comments: {
        include: { author: { select: { displayName: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!ticket) throw ApiError.notFound('Ticket not found');
  return ticket;
};

export const updateTicketStatus = async (
  ticketId: string, orgId: string, userId: string,
  data: {
    status: TicketStatus;
    assignedToId?: string;
    resolution?: string;
  },
) => {
  const ticket = await prisma.helpdeskTicket.findFirst({ where: { id: ticketId, organizationId: orgId } });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  const isSlaBreached = ticket.slaDeadline && new Date() > ticket.slaDeadline;

  return prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: {
      status: data.status,
      ...(data.assignedToId ? { assignedToId: data.assignedToId } : {}),
      ...(data.resolution ? { resolution: data.resolution } : {}),
      ...(data.status === TicketStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
      ...(data.status === TicketStatus.CLOSED ? { closedAt: new Date() } : {}),
      isSlaBreached: isSlaBreached ?? false,
    },
  });
};

export const addComment = async (
  ticketId: string, orgId: string, authorId: string,
  content: string, isInternal: boolean = false,
) => {
  const ticket = await prisma.helpdeskTicket.findFirst({ where: { id: ticketId, organizationId: orgId } });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  // Move to in-progress if it was open
  if (ticket.status === TicketStatus.OPEN) {
    await prisma.helpdeskTicket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.IN_PROGRESS },
    });
  }

  return prisma.ticketComment.create({
    data: { ticketId, authorId, content, isInternal },
    include: { author: { select: { displayName: true, email: true } } },
  });
};

export const submitCsat = async (ticketId: string, orgId: string, userId: string, data: {
  rating: number; feedback?: string;
}) => {
  const ticket = await prisma.helpdeskTicket.findFirst({
    where: { id: ticketId, organizationId: orgId, requestedById: userId },
  });
  if (!ticket) throw ApiError.notFound('Ticket not found');

  return prisma.helpdeskTicket.update({
    where: { id: ticketId },
    data: { csatRating: data.rating, csatFeedback: data.feedback },
  });
};

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export const createArticle = async (orgId: string, authorId: string, data: {
  title: string; content: string; category: TicketType;
  tags?: string[]; isPublished?: boolean;
}) => {
  return prisma.knowledgeArticle.create({
    data: {
      ...data,
      organizationId: orgId,
      authorId,
      isPublished: data.isPublished ?? false,
    },
  });
};

export const searchArticles = async (orgId: string, query?: string, category?: TicketType) => {
  return prisma.knowledgeArticle.findMany({
    where: {
      organizationId: orgId,
      isPublished: true,
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { content: { contains: query, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    include: { author: { select: { displayName: true } } },
    orderBy: { viewCount: 'desc' },
  });
};

export const viewArticle = async (articleId: string, orgId: string) => {
  const article = await prisma.knowledgeArticle.findFirst({
    where: { id: articleId, organizationId: orgId, isPublished: true },
    include: { author: { select: { displayName: true } } },
  });
  if (!article) throw ApiError.notFound('Article not found');

  // Increment view count
  await prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: { viewCount: { increment: 1 } },
  });

  return article;
};

export const rateArticle = async (articleId: string, helpful: boolean) => {
  return prisma.knowledgeArticle.update({
    where: { id: articleId },
    data: {
      helpfulCount: helpful ? { increment: 1 } : undefined,
      notHelpfulCount: !helpful ? { increment: 1 } : undefined,
    },
  });
};

// ─── Analytics ────────────────────────────────────────────────────────────────

export const getHelpdeskAnalytics = async (orgId: string) => {
  const [byStatus, byType, byPriority, avgRating, slaBreaches] = await Promise.all([
    prisma.helpdeskTicket.groupBy({
      by: ['status'],
      where: { organizationId: orgId },
      _count: true,
    }),
    prisma.helpdeskTicket.groupBy({
      by: ['type'],
      where: { organizationId: orgId },
      _count: true,
    }),
    prisma.helpdeskTicket.groupBy({
      by: ['priority'],
      where: { organizationId: orgId },
      _count: true,
    }),
    prisma.helpdeskTicket.aggregate({
      where: { organizationId: orgId, csatRating: { not: null } },
      _avg: { csatRating: true },
    }),
    prisma.helpdeskTicket.count({
      where: { organizationId: orgId, isSlaBreached: true },
    }),
  ]);

  return { byStatus, byType, byPriority, avgCsatRating: avgRating._avg.csatRating, slaBreaches };
};
