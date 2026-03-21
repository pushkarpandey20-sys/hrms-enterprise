import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { dashboardService } from '../services/dashboard.service';

export const dashboardController = {
  hr: asyncHandler(async (req: Request, res: Response) => {
    const data = await dashboardService.getHRDashboard(req.user!.organizationId);
    res.json({ success: true, data });
  }),
};
