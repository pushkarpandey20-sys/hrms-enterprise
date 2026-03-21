import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { payrollService } from '../services/payroll.service';
import { prisma } from '../../../config/database';

export const payrollController = {
  runPayroll: asyncHandler(async (req: Request, res: Response) => {
    const { month, year, employeeIds } = req.body;
    const run = await payrollService.runPayroll(req.user!.organizationId, month, year, employeeIds);
    res.json({ success: true, data: run });
  }),

  getPayrollRuns: asyncHandler(async (req: Request, res: Response) => {
    const runs = await prisma.payrollRun.findMany({
      where: { organizationId: req.user!.organizationId },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ success: true, data: runs });
  }),

  getPayslips: asyncHandler(async (req: Request, res: Response) => {
    const { runId } = req.params;
    const payslips = await prisma.payslip.findMany({
      where: { payrollRunId: runId },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, photoUrl: true } } },
    });
    res.json({ success: true, data: payslips });
  }),

  getMyPayslips: asyncHandler(async (req: Request, res: Response) => {
    const payslips = await prisma.payslip.findMany({
      where: { employeeId: req.user!.employeeId! },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });
    res.json({ success: true, data: payslips });
  }),

  downloadPayslip: asyncHandler(async (req: Request, res: Response) => {
    const pdf = await payrollService.generatePayslipPdf(req.params.payslipId);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="payslip.pdf"`);
    res.send(pdf);
  }),

  emailPayslips: asyncHandler(async (req: Request, res: Response) => {
    await payrollService.emailPayslips(req.params.runId);
    res.json({ success: true, message: 'Payslips emailed successfully' });
  }),

  approvePayroll: asyncHandler(async (req: Request, res: Response) => {
    const run = await prisma.payrollRun.update({
      where: { id: req.params.runId },
      data: { status: 'APPROVED', approvedById: req.user!.userId, approvedAt: new Date() },
    });
    res.json({ success: true, data: run });
  }),

  markPaid: asyncHandler(async (req: Request, res: Response) => {
    const run = await prisma.payrollRun.update({
      where: { id: req.params.runId },
      data: { status: 'PAID', paidAt: new Date() },
    });
    res.json({ success: true, data: run });
  }),

  exportRegister: asyncHandler(async (req: Request, res: Response) => {
    const { month, year } = req.query;
    const buffer = await payrollService.exportPayrollRegister(req.user!.organizationId, Number(month), Number(year));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="payroll-register.xlsx"');
    res.send(buffer);
  }),
};
