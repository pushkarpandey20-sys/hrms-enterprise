import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { prisma } from '../../../config/database';

export const announcementController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const announcements = await prisma.announcement.findMany({
      where: { organizationId: req.user!.organizationId, isPublished: true },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });
    res.json({ success: true, data: announcements });
  }),
  create: asyncHandler(async (req: Request, res: Response) => {
    const ann = await prisma.announcement.create({
      data: { ...req.body, organizationId: req.user!.organizationId, createdById: req.user!.userId, publishedAt: req.body.isPublished ? new Date() : undefined },
    });
    res.status(201).json({ success: true, data: ann });
  }),
  update: asyncHandler(async (req: Request, res: Response) => {
    const ann = await prisma.announcement.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: ann });
  }),
  delete: asyncHandler(async (req: Request, res: Response) => {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  }),
};
