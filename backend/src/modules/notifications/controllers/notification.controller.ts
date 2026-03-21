import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { notificationService } from '../services/notification.service';

export const notificationController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const { notifications, total } = await notificationService.list(req.user!.userId, page);
    res.json({ success: true, data: notifications, total });
  }),
  unread: asyncHandler(async (req: Request, res: Response) => {
    const data = await notificationService.getUnread(req.user!.userId);
    res.json({ success: true, data, count: data.length });
  }),
  markRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markRead(req.user!.userId, req.params.id);
    res.json({ success: true });
  }),
  markAllRead: asyncHandler(async (req: Request, res: Response) => {
    await notificationService.markAllRead(req.user!.userId);
    res.json({ success: true });
  }),
};
