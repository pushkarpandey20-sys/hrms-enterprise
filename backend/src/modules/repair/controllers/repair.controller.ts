import { Request, Response, NextFunction } from 'express';
import * as repairService from '../services/repair.service';
import { z } from 'zod';

const createSchema = z.object({
  assetId: z.string().uuid(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  category: z.enum(['HARDWARE', 'SOFTWARE', 'NETWORK', 'PERIPHERAL', 'OTHER']),
  description: z.string().min(10),
  estimatedCost: z.number().positive().optional(),
  photos: z.array(z.string()).max(5).optional(),
});

const stageSchema = z.object({
  newStatus: z.enum([
    'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
    'VENDOR_ASSIGNED', 'IN_REPAIR', 'QC_CHECK', 'REPAIRED', 'RETURNED', 'CLOSED',
  ]),
  notes: z.string().optional(),
  actualCost: z.number().positive().optional(),
  vendorName: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  loanerAssetId: z.string().uuid().optional(),
});

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createSchema.parse(req.body);
    const ticket = await repairService.createRepairTicket(
      req.user!.organizationId, req.user!.userId, data
    );
    res.status(201).json({ success: true, data: ticket });
  } catch (e) { next(e); }
};

export const listTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, assignedToId, page, pageSize } = req.query as Record<string, string>;
    const result = await repairService.getRepairTickets(req.user!.organizationId, {
      status: status as any,
      priority: priority as any,
      assignedToId,
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const getTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await repairService.getRepairTicketById(req.params.id, req.user!.organizationId);
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
};

export const advanceStage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = stageSchema.parse(req.body);
    const ticket = await repairService.advanceStage(
      req.params.id, req.user!.organizationId, req.user!.userId, data
    );
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
};

export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, isInternal } = req.body;
    const comment = await repairService.addComment(
      req.params.id, req.user!.organizationId, req.user!.userId, content, isInternal
    );
    res.status(201).json({ success: true, data: comment });
  } catch (e) { next(e); }
};

export const submitCsat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rating, feedback } = req.body;
    const result = await repairService.submitCsat(
      req.params.id, req.user!.organizationId, req.user!.userId, rating, feedback
    );
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { from, to } = req.query as Record<string, string>;
    const data = await repairService.getRepairAnalytics(
      req.user!.organizationId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    );
    res.json({ success: true, data });
  } catch (e) { next(e); }
};
