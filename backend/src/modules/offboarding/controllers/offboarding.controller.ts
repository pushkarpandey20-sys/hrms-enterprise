import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/offboarding.service';
import { z } from 'zod';
import { ExitType, ExitReason, OffboardStatus, ChecklistStatus, ClearanceStatus } from '@prisma/client';

const initiateSchema = z.object({
  employeeId: z.string().uuid(),
  exitType: z.nativeEnum(ExitType),
  exitDate: z.string().datetime().transform(v => new Date(v)),
  reason: z.nativeEnum(ExitReason).optional(),
  notes: z.string().optional(),
});

export const initiateOffboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = initiateSchema.parse(req.body);
    const result = await svc.initiateOffboarding(req.user!.organizationId, req.user!.userId, data);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const listCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, pageSize } = req.query as any;
    const result = await svc.listOffboardingCases(req.user!.organizationId, {
      status, page: page ? +page : 1, pageSize: pageSize ? +pageSize : 20,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const getCase = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getOffboardingCase(req.params.id, req.user!.organizationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const updateChecklistItem = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.updateChecklistItem(
      req.params.itemId, req.user!.organizationId, req.user!.userId, req.body
    );
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const signOffClearance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.signOffClearance(
      req.params.id, req.user!.organizationId, req.user!.userId, req.body
    );
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const getFnF = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.calculateFnF(req.params.id, req.user!.organizationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};

export const submitExitInterview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.submitExitInterview(req.params.id, req.user!.organizationId, {
      ...req.body,
      conductedById: req.user!.userId,
    });
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

export const completeOffboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.completeOffboarding(req.params.id, req.user!.organizationId, req.user!.userId);
    res.json(result);
  } catch (e) { next(e); }
};

export const cancelOffboarding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.cancelOffboarding(req.params.id, req.user!.organizationId, req.body.reason);
    res.json({ success: true, message: 'Offboarding cancelled' });
  } catch (e) { next(e); }
};
