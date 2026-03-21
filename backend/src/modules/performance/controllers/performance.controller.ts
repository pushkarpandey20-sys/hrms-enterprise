import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/performance.service';
import { z } from 'zod';
import { CycleType, GoalType, GoalCategory, ReviewType, FeedbackRelation, PIPStatus } from '@prisma/client';

const cycleSchema = z.object({
  title: z.string().min(1),
  type: z.nativeEnum(CycleType),
  startDate: z.string().datetime().transform(v => new Date(v)),
  endDate: z.string().datetime().transform(v => new Date(v)),
  selfReviewDeadline: z.string().datetime().transform(v => new Date(v)).optional(),
  managerReviewDeadline: z.string().datetime().transform(v => new Date(v)).optional(),
  peersDeadline: z.string().datetime().transform(v => new Date(v)).optional(),
});

const goalSchema = z.object({
  cycleId: z.string().uuid(),
  employeeId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.nativeEnum(GoalType),
  category: z.nativeEnum(GoalCategory),
  targetValue: z.number().positive().optional(),
  weightage: z.number().min(0).max(100).optional(),
  dueDate: z.string().datetime().transform(v => new Date(v)).optional(),
  kpiMetric: z.string().optional(),
});

const pipSchema = z.object({
  employeeId: z.string().uuid(),
  managerId: z.string().uuid(),
  reason: z.string().min(10),
  startDate: z.string().datetime().transform(v => new Date(v)),
  endDate: z.string().datetime().transform(v => new Date(v)),
  objectives: z.string().min(10),
  expectedOutcomes: z.string().min(10),
  reviewFrequency: z.string(),
});

// Cycles
export const createCycle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = cycleSchema.parse(req.body);
    const cycle = await svc.createCycle(req.user!.organizationId, data);
    res.status(201).json({ success: true, data: cycle });
  } catch (e) { next(e); }
};

export const listCycles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await svc.listCycles(req.user!.organizationId);
    res.json({ success: true, data: cycles });
  } catch (e) { next(e); }
};

export const updateCycleStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycle = await svc.updateCycleStatus(req.params.id, req.user!.organizationId, req.body.status);
    res.json({ success: true, data: cycle });
  } catch (e) { next(e); }
};

// Goals
export const createGoal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = goalSchema.parse(req.body);
    const goal = await svc.createGoal({ ...data, orgId: req.user!.organizationId });
    res.status(201).json({ success: true, data: goal });
  } catch (e) { next(e); }
};

export const updateGoalProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentValue, comment } = req.body;
    const goal = await svc.updateGoalProgress(req.params.id, req.user!.employeeId!, currentValue, comment);
    res.json({ success: true, data: goal });
  } catch (e) { next(e); }
};

export const getMyGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await svc.getEmployeeGoals(req.user!.employeeId!, req.query.cycleId as string);
    res.json({ success: true, data: goals });
  } catch (e) { next(e); }
};

export const getEmployeeGoals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const goals = await svc.getEmployeeGoals(req.params.employeeId, req.query.cycleId as string);
    res.json({ success: true, data: goals });
  } catch (e) { next(e); }
};

// Reviews
export const initiateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await svc.initiateReview(req.params.cycleId, req.user!.organizationId, req.body);
    res.status(201).json({ success: true, data: review });
  } catch (e) { next(e); }
};

export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await svc.submitReview(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, data: review });
  } catch (e) { next(e); }
};

export const getCycleReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reviews = await svc.getCycleReviews(req.params.cycleId, req.user!.organizationId);
    res.json({ success: true, data: reviews });
  } catch (e) { next(e); }
};

// 360 Feedback
export const requestFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fb = await svc.requestFeedback({ ...req.body, requestedById: req.user!.userId });
    res.status(201).json({ success: true, data: fb });
  } catch (e) { next(e); }
};

export const submitFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fb = await svc.submitFeedback(req.params.id, req.user!.userId, req.body);
    res.json({ success: true, data: fb });
  } catch (e) { next(e); }
};

export const getMyFeedback = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fb = await svc.getEmployeeFeedback(req.user!.employeeId!, req.query.cycleId as string);
    res.json({ success: true, data: fb });
  } catch (e) { next(e); }
};

// PIP
export const createPIP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = pipSchema.parse(req.body);
    const pip = await svc.createPIP(req.user!.organizationId, data);
    res.status(201).json({ success: true, data: pip });
  } catch (e) { next(e); }
};

export const addCheckIn = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ci = await svc.addPIPCheckIn(req.params.pipId, req.user!.userId, req.body);
    res.status(201).json({ success: true, data: ci });
  } catch (e) { next(e); }
};

export const closePIP = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pip = await svc.closePIP(req.params.pipId, req.user!.userId, req.body);
    res.json({ success: true, data: pip });
  } catch (e) { next(e); }
};

export const getEmployeePIPs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pips = await svc.getEmployeePIPs(req.params.employeeId, req.user!.organizationId);
    res.json({ success: true, data: pips });
  } catch (e) { next(e); }
};

export const calculateBonus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.calculateBonus(req.user!.organizationId, req.params.cycleId);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};
