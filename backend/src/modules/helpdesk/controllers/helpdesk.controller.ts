import { Request, Response, NextFunction } from 'express';
import * as svc from '../services/helpdesk.service';
import { UserRole } from '@prisma/client';

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cat = await svc.createCategory(req.user!.organizationId, req.body);
    res.status(201).json({ success: true, data: cat });
  } catch (e) { next(e); }
};

export const listCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cats = await svc.listCategories(req.user!.organizationId, req.query.type as any);
    res.json({ success: true, data: cats });
  } catch (e) { next(e); }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await svc.createTicket(req.user!.organizationId, req.user!.userId, req.body);
    res.status(201).json({ success: true, data: ticket });
  } catch (e) { next(e); }
};

export const listTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, priority, type, assignedToId, page, pageSize } = req.query as any;
    const result = await svc.listTickets(req.user!.organizationId, {
      status, priority, type, assignedToId,
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const getMyTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, page, pageSize } = req.query as any;
    const result = await svc.listTickets(req.user!.organizationId, {
      requestedById: req.user!.userId,
      status,
      page: page ? +page : 1,
      pageSize: pageSize ? +pageSize : 20,
    });
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
};

export const getTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await svc.getTicketById(req.params.id, req.user!.organizationId);
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
};

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const ticket = await svc.updateTicketStatus(req.params.id, req.user!.organizationId, req.user!.userId, req.body);
    res.json({ success: true, data: ticket });
  } catch (e) { next(e); }
};

export const addComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content, isInternal } = req.body;
    const comment = await svc.addComment(req.params.id, req.user!.organizationId, req.user!.userId, content, isInternal);
    res.status(201).json({ success: true, data: comment });
  } catch (e) { next(e); }
};

export const submitCsat = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await svc.submitCsat(req.params.id, req.user!.organizationId, req.user!.userId, req.body);
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
};

// Knowledge Base
export const createArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await svc.createArticle(req.user!.organizationId, req.user!.userId, req.body);
    res.status(201).json({ success: true, data: article });
  } catch (e) { next(e); }
};

export const searchArticles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { q, category } = req.query as any;
    const articles = await svc.searchArticles(req.user!.organizationId, q, category);
    res.json({ success: true, data: articles });
  } catch (e) { next(e); }
};

export const viewArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const article = await svc.viewArticle(req.params.id, req.user!.organizationId);
    res.json({ success: true, data: article });
  } catch (e) { next(e); }
};

export const rateArticle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await svc.rateArticle(req.params.id, req.body.helpful);
    res.json({ success: true });
  } catch (e) { next(e); }
};

export const getAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await svc.getHelpdeskAnalytics(req.user!.organizationId);
    res.json({ success: true, data });
  } catch (e) { next(e); }
};
