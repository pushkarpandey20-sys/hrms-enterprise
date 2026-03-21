import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { prisma } from '../../../config/database';
import ExcelJS from 'exceljs';

const writeExcel = async (res: Response, filename: string, headers: string[], rows: any[][]) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report');
  ws.addRow(headers);
  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0F1E' } };
  rows.forEach(r => ws.addRow(r));
  ws.columns.forEach(c => { c.width = 18; });
  const buffer = await wb.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

export const reportController = {
  birthdayAnniversary: asyncHandler(async (req: Request, res: Response) => {
    const { month } = req.query;
    const m = Number(month) || new Date().getMonth() + 1;
    const employees = await prisma.employee.findMany({
      where: { organizationId: req.user!.organizationId, status: 'ACTIVE' },
      select: { employeeCode: true, firstName: true, lastName: true, dateOfBirth: true, joiningDate: true, department: { select: { name: true } } },
    });
    const filtered = employees.filter(e =>
      (e.dateOfBirth && new Date(e.dateOfBirth).getMonth() + 1 === m) ||
      (e.joiningDate && new Date(e.joiningDate).getMonth() + 1 === m)
    );
    await writeExcel(res, `birthday-anniversary-${m}.xlsx`,
      ['Code', 'Name', 'Department', 'Birthday', 'Joining Date', 'Work Anniversary'],
      filtered.map(e => [
        e.employeeCode,
        `${e.firstName} ${e.lastName}`,
        (e as any).department?.name || '',
        e.dateOfBirth ? new Date(e.dateOfBirth).toLocaleDateString() : '',
        e.joiningDate.toLocaleDateString(),
        `${new Date().getFullYear() - e.joiningDate.getFullYear()} years`,
      ])
    );
  }),

  documentExpiry: asyncHandler(async (req: Request, res: Response) => {
    const { days = 30 } = req.query;
    const cutoff = new Date(Date.now() + Number(days) * 24 * 60 * 60 * 1000);
    const docs = await prisma.employeeDocument.findMany({
      where: { employee: { organizationId: req.user!.organizationId }, expiryDate: { lte: cutoff, gte: new Date() } },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { expiryDate: 'asc' },
    });
    await writeExcel(res, 'document-expiry.xlsx',
      ['Employee Code', 'Name', 'Document', 'Type', 'Expiry Date', 'Days Left'],
      docs.map(d => [
        d.employee.employeeCode,
        `${d.employee.firstName} ${d.employee.lastName}`,
        d.name, d.type,
        d.expiryDate?.toLocaleDateString() || '',
        d.expiryDate ? Math.floor((d.expiryDate.getTime() - Date.now()) / 86400000) : '',
      ])
    );
  }),

  headcount: asyncHandler(async (req: Request, res: Response) => {
    const employees = await prisma.employee.findMany({
      where: { organizationId: req.user!.organizationId },
      include: { department: true, designation: true },
      orderBy: { status: 'asc' },
    });
    await writeExcel(res, 'headcount.xlsx',
      ['Code', 'Name', 'Department', 'Designation', 'Status', 'Employment Type', 'Joining Date'],
      employees.map(e => [e.employeeCode, `${e.firstName} ${e.lastName}`, (e as any).department?.name || '', (e as any).designation?.name || '', e.status, e.employmentType, e.joiningDate.toLocaleDateString()])
    );
  }),
};
