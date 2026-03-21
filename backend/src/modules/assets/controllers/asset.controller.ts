import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { assetService } from '../services/asset.service';
import { prisma } from '../../../config/database';

export const assetController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const assets = await assetService.list(req.user!.organizationId, req.query);
    res.json({ success: true, data: assets });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const asset = await prisma.asset.findFirst({
      where: { id: req.params.id, organizationId: req.user!.organizationId },
      include: { category: true, assignments: { include: { employee: { select: { firstName: true, lastName: true, photoUrl: true } } } }, maintenanceLogs: true },
    });
    if (!asset) throw new Error('Asset not found');
    res.json({ success: true, data: asset });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const asset = await assetService.create(req.user!.organizationId, req.body);
    res.status(201).json({ success: true, data: asset });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const asset = await prisma.asset.update({ where: { id: req.params.id }, data: req.body });
    res.json({ success: true, data: asset });
  }),

  assign: asyncHandler(async (req: Request, res: Response) => {
    const result = await assetService.assign(req.params.id, req.body.employeeId, req.user!.userId, req.body.notes);
    res.json({ success: true, data: result });
  }),

  returnAsset: asyncHandler(async (req: Request, res: Response) => {
    await assetService.returnAsset(req.params.assignmentId, req.user!.userId, req.body.condition, req.body.notes);
    res.json({ success: true, message: 'Asset returned successfully' });
  }),

  getCategories: asyncHandler(async (req: Request, res: Response) => {
    const cats = await prisma.assetCategory.findMany({ include: { children: true } });
    res.json({ success: true, data: cats });
  }),

  bulkImport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new Error('No file uploaded');
    const results = await assetService.bulkImport(req.user!.organizationId, req.file.buffer);
    res.json({ success: true, data: results });
  }),

  exportRegister: asyncHandler(async (req: Request, res: Response) => {
    const buffer = await assetService.exportRegister(req.user!.organizationId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="asset-register.xlsx"');
    res.send(buffer);
  }),
};
