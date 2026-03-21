import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { leaveService } from '../services/leave.service';
import { prisma } from '../../../config/database';

export const leaveController = {
  apply: asyncHandler(async (req: Request, res: Response) => {
    const leave = await leaveService.applyLeave(req.user!.employeeId!, {
      ...req.body,
      attachmentBuffer: req.file?.buffer,
    });
    res.status(201).json({ success: true, data: leave });
  }),

  process: asyncHandler(async (req: Request, res: Response) => {
    const leave = await leaveService.processLeave(
      req.params.id, req.body.action, req.user!.userId, req.user!.role, req.body.note,
    );
    res.json({ success: true, data: leave });
  }),

  getMyLeaves: asyncHandler(async (req: Request, res: Response) => {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: req.user!.employeeId! },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: leaves });
  }),

  getPendingApprovals: asyncHandler(async (req: Request, res: Response) => {
    const where: any = req.user!.role === 'MANAGER'
      ? { status: 'PENDING', employee: { managerId: req.user!.employeeId } }
      : { status: { in: ['PENDING', 'MGR_APPROVED'] }, employee: { organizationId: req.user!.organizationId } };
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, photoUrl: true, department: { select: { name: true } } } }, leaveType: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: leaves });
  }),

  teamCalendar: asyncHandler(async (req: Request, res: Response) => {
    const { month, year } = req.query;
    const data = await leaveService.getTeamCalendar(req.user!.organizationId, Number(month), Number(year));
    res.json({ success: true, data });
  }),

  getBalances: asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const empId = req.params.employeeId || req.user!.employeeId!;
    const data = await leaveService.getBalances(empId, year);
    res.json({ success: true, data });
  }),

  getLeaveTypes: asyncHandler(async (req: Request, res: Response) => {
    const types = await prisma.leaveType.findMany({
      where: { organizationId: req.user!.organizationId, isActive: true },
    });
    res.json({ success: true, data: types });
  }),

  getHolidays: asyncHandler(async (req: Request, res: Response) => {
    const { year } = req.query;
    const y = Number(year) || new Date().getFullYear();
    const holidays = await prisma.holiday.findMany({
      where: { organizationId: req.user!.organizationId, date: { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31) } },
      orderBy: { date: 'asc' },
    });
    res.json({ success: true, data: holidays });
  }),

  exportReport: asyncHandler(async (req: Request, res: Response) => {
    const year = Number(req.query.year) || new Date().getFullYear();
    const buffer = await leaveService.exportLeaveReport(req.user!.organizationId, year);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="leave-report-${year}.xlsx"`);
    res.send(buffer);
  }),
};
