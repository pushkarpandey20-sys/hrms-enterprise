import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { employeeService } from '../services/employee.service';
import { paginatedResponse } from '../../../shared/utils/pagination';
import { getPaginationOptions } from '../../../shared/utils/pagination';

export const employeeController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const { employees, total } = await employeeService.list(req.user!.organizationId, req);
    const { page, limit } = getPaginationOptions(req);
    res.json({ success: true, ...paginatedResponse(employees, total, page, limit) });
  }),

  getById: asyncHandler(async (req: Request, res: Response) => {
    const emp = await employeeService.getById(req.params.id, req.user!.organizationId);
    res.json({ success: true, data: emp });
  }),

  create: asyncHandler(async (req: Request, res: Response) => {
    const emp = await employeeService.create(
      req.user!.organizationId,
      req.body,
      req.file,
    );
    res.status(201).json({ success: true, data: emp });
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const emp = await employeeService.update(
      req.params.id,
      req.user!.organizationId,
      req.body,
      req.file,
    );
    res.json({ success: true, data: emp });
  }),

  updateStatus: asyncHandler(async (req: Request, res: Response) => {
    const emp = await employeeService.updateStatus(
      req.params.id,
      req.user!.organizationId,
      req.body.status,
      req.body.reason,
    );
    res.json({ success: true, data: emp });
  }),

  getOrgChart: asyncHandler(async (req: Request, res: Response) => {
    const data = await employeeService.getOrgChart(req.user!.organizationId);
    res.json({ success: true, data });
  }),

  bulkImport: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new Error('No file uploaded');
    const results = await employeeService.bulkImport(req.user!.organizationId, req.file.buffer);
    res.json({ success: true, data: results });
  }),

  exportExcel: asyncHandler(async (req: Request, res: Response) => {
    const fields = req.query.fields ? (req.query.fields as string).split(',') : [];
    const buffer = await employeeService.exportExcel(req.user!.organizationId, fields);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="employees.xlsx"');
    res.send(buffer);
  }),
};
