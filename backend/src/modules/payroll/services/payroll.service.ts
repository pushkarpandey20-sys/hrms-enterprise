import { prisma } from '../../../config/database';
import { ApiError } from '../../../shared/utils/ApiError';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { cloudinary } from '../../../config/cloudinary';
import { emailService } from '../../notifications/services/email.service';

export class PayrollService {
  async runPayroll(orgId: string, month: number, year: number, employeeIds?: string[]) {
    // Create or get payroll run
    let run = await prisma.payrollRun.findUnique({
      where: { organizationId_month_year: { organizationId: orgId, month, year } },
    });
    if (run?.status === 'PAID') throw ApiError.conflict('Payroll already paid for this period');

    if (!run) {
      run = await prisma.payrollRun.create({
        data: { organizationId: orgId, month, year, status: 'PROCESSING' },
      });
    }

    const where: any = { organizationId: orgId, status: 'ACTIVE' };
    if (employeeIds?.length) where.id = { in: employeeIds };

    const employees = await prisma.employee.findMany({
      where,
      include: {
        salaryStructures: {
          where: { isActive: true },
          include: { components: { include: { component: true } } },
        },
      },
    });

    let totalGross = 0, totalDeductions = 0, totalNet = 0;

    for (const emp of employees) {
      const structure = emp.salaryStructures[0];
      if (!structure) continue;

      // Calculate LOP (Loss of Pay)
      const daysInMonth = new Date(year, month, 0).getDate();
      const presentDays = await prisma.attendance.count({
        where: {
          employeeId: emp.id,
          date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month - 1, daysInMonth) },
          status: { in: ['PRESENT', 'ON_LEAVE', 'HALF_DAY'] },
        },
      });
      const lopDays = Math.max(0, daysInMonth - presentDays - (await this.getHolidayCount(orgId, month, year)));

      // Compute earnings & deductions
      const earningsBreakdown: Record<string, number> = {};
      const deductionsBreakdown: Record<string, number> = {};
      let grossEarnings = 0, totalDeductionsEmp = 0;
      let basicSalary = 0, pfEmployee = 0, esiEmployee = 0;

      for (const sc of structure.components) {
        const comp = sc.component;
        let amount = sc.monthlyAmount;

        if (comp.code === 'BASIC') basicSalary = amount;

        // LOP deduction
        const dailyRate = amount / daysInMonth;
        amount = amount - (dailyRate * lopDays);

        if (comp.componentType === 'EARNING') {
          earningsBreakdown[comp.name] = Math.round(amount);
          grossEarnings += amount;
        } else if (comp.componentType === 'DEDUCTION') {
          deductionsBreakdown[comp.name] = Math.round(amount);
          totalDeductionsEmp += amount;
          if (comp.code === 'PF_EMPLOYEE') pfEmployee = amount;
          if (comp.code === 'ESI_EMPLOYEE') esiEmployee = amount;
        } else if (comp.componentType === 'STATUTORY') {
          deductionsBreakdown[comp.name] = Math.round(amount);
          totalDeductionsEmp += amount;
        }
      }

      const netPay = Math.round(grossEarnings - totalDeductionsEmp);

      await prisma.payslip.upsert({
        where: { payrollRunId: run.id, employeeId: emp.id } as any,
        create: {
          payrollRunId: run.id, employeeId: emp.id,
          month, year, workingDays: daysInMonth, presentDays, lopDays,
          basicSalary: Math.round(basicSalary), grossEarnings: Math.round(grossEarnings),
          totalDeductions: Math.round(totalDeductionsEmp), netPay,
          pfEmployee: Math.round(pfEmployee), esiEmployee: Math.round(esiEmployee),
          earningsBreakdown, deductionsBreakdown,
        },
        update: {
          presentDays, lopDays, basicSalary: Math.round(basicSalary),
          grossEarnings: Math.round(grossEarnings), totalDeductions: Math.round(totalDeductionsEmp),
          netPay, pfEmployee: Math.round(pfEmployee), esiEmployee: Math.round(esiEmployee),
          earningsBreakdown, deductionsBreakdown,
        },
      });

      totalGross += grossEarnings;
      totalDeductions += totalDeductionsEmp;
      totalNet += netPay;
    }

    return prisma.payrollRun.update({
      where: { id: run.id },
      data: {
        status: 'PROCESSED',
        totalEmployees: employees.length,
        totalGross: Math.round(totalGross),
        totalDeductions: Math.round(totalDeductions),
        totalNetPay: Math.round(totalNet),
        processedAt: new Date(),
      },
    });
  }

  async getHolidayCount(orgId: string, month: number, year: number): Promise<number> {
    return prisma.holiday.count({
      where: {
        organizationId: orgId,
        date: { gte: new Date(year, month - 1, 1), lte: new Date(year, month - 1, new Date(year, month, 0).getDate()) },
        isOptional: false,
      },
    });
  }

  async generatePayslipPdf(payslipId: string): Promise<Buffer> {
    const payslip = await prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: { include: { department: true, designation: true, organization: true } },
        payrollRun: true,
      },
    });
    if (!payslip) throw ApiError.notFound('Payslip not found');

    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks: Buffer[] = [];
      doc.on('data', (c) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      const emp = payslip.employee;
      const org = emp.organization;
      const monthName = new Date(payslip.year, payslip.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

      // Header
      doc.rect(0, 0, 595, 80).fill('#0A0F1E');
      doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(20).text(org.name, 40, 20);
      doc.font('Helvetica').fontSize(10).text('PAYSLIP', 40, 45);
      doc.text(monthName, 40, 58);

      // Employee info box
      doc.fill('#000000').rect(40, 95, 515, 80).fill('#F8FAFC').stroke('#E2E8F0');
      doc.fill('#111827').font('Helvetica-Bold').fontSize(11)
        .text(`${emp.firstName} ${emp.lastName}`, 50, 105);
      doc.font('Helvetica').fontSize(9)
        .text(`Employee Code: ${emp.employeeCode}`, 50, 120)
        .text(`Department: ${(emp.department as any)?.name || '-'}`, 50, 133)
        .text(`Designation: ${(emp.designation as any)?.name || '-'}`, 50, 146)
        .text(`Bank A/C: ${emp.bankAccountNo || '-'}`, 300, 120)
        .text(`PAN: ${emp.panNumber || '-'}`, 300, 133)
        .text(`PF UAN: ${emp.uan || '-'}`, 300, 146);

      // Days summary
      doc.rect(40, 185, 515, 30).fill('#3B82F6');
      doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(9)
        .text(`Working Days: ${payslip.workingDays}`, 50, 195)
        .text(`Present: ${payslip.presentDays}`, 180, 195)
        .text(`LOP Days: ${payslip.lopDays}`, 310, 195)
        .text(`Net Pay Days: ${payslip.presentDays - payslip.lopDays}`, 420, 195);

      // Earnings & Deductions table
      const earnings = payslip.earningsBreakdown as Record<string, number>;
      const deductions = payslip.deductionsBreakdown as Record<string, number>;
      const tableY = 230;

      doc.fill('#1E3A5F').rect(40, tableY, 255, 22).fill().rect(300, tableY, 255, 22).fill();
      doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(9)
        .text('EARNINGS', 50, tableY + 6).text('AMOUNT (₹)', 240, tableY + 6)
        .text('DEDUCTIONS', 310, tableY + 6).text('AMOUNT (₹)', 500, tableY + 6);

      let rowY = tableY + 22;
      const earnKeys = Object.keys(earnings);
      const dedKeys = Object.keys(deductions);
      const maxRows = Math.max(earnKeys.length, dedKeys.length);

      for (let i = 0; i < maxRows; i++) {
        const bg = i % 2 === 0 ? '#F9FAFB' : '#FFFFFF';
        doc.rect(40, rowY, 255, 20).fill(bg);
        doc.rect(300, rowY, 255, 20).fill(bg);

        doc.fill('#374151').font('Helvetica').fontSize(9);
        if (earnKeys[i]) {
          doc.text(earnKeys[i], 50, rowY + 5).text(`₹${earnings[earnKeys[i]].toLocaleString()}`, 235, rowY + 5, { align: 'right', width: 55 });
        }
        if (dedKeys[i]) {
          doc.text(dedKeys[i], 310, rowY + 5).text(`₹${deductions[dedKeys[i]].toLocaleString()}`, 495, rowY + 5, { align: 'right', width: 55 });
        }
        rowY += 20;
      }

      // Totals
      doc.rect(40, rowY, 255, 22).fill('#E0F2FE');
      doc.rect(300, rowY, 255, 22).fill('#FEE2E2');
      doc.fill('#1E3A5F').font('Helvetica-Bold').fontSize(9)
        .text('GROSS EARNINGS', 50, rowY + 6)
        .text(`₹${payslip.grossEarnings.toLocaleString()}`, 235, rowY + 6, { align: 'right', width: 55 });
      doc.fill('#991B1B')
        .text('TOTAL DEDUCTIONS', 310, rowY + 6)
        .text(`₹${payslip.totalDeductions.toLocaleString()}`, 495, rowY + 6, { align: 'right', width: 55 });

      // Net pay
      rowY += 30;
      doc.rect(40, rowY, 515, 35).fill('#0A0F1E');
      doc.fill('#F59E0B').font('Helvetica-Bold').fontSize(14)
        .text(`NET PAY: ₹${payslip.netPay.toLocaleString()}`, 50, rowY + 10);

      doc.end();
    });
  }

  async emailPayslips(payrollRunId: string) {
    const payslips = await prisma.payslip.findMany({
      where: { payrollRunId },
      include: { employee: { include: { user: true } } },
    });

    for (const p of payslips) {
      try {
        const pdfBuffer = await this.generatePayslipPdf(p.id);
        const monthName = new Date(p.year, p.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
        if (p.employee.workEmail) {
          await emailService.sendPayslip(p.employee.workEmail, `${p.employee.firstName} ${p.employee.lastName}`, monthName, pdfBuffer);
        }
        await prisma.payslip.update({ where: { id: p.id }, data: { emailSentAt: new Date() } });
      } catch {}
    }
  }

  async exportPayrollRegister(orgId: string, month: number, year: number) {
    const payslips = await prisma.payslip.findMany({
      where: { payrollRun: { organizationId: orgId, month, year } },
      include: { employee: { include: { department: true, designation: true } } },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Payroll Register');
    const headers = ['Code', 'Name', 'Department', 'Designation', 'Basic', 'Gross', 'PF', 'ESI', 'TDS', 'Total Deductions', 'Net Pay'];
    ws.addRow(headers);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0F1E' } };

    payslips.forEach(p => {
      ws.addRow([
        p.employee.employeeCode, `${p.employee.firstName} ${p.employee.lastName}`,
        (p.employee as any).department?.name || '', (p.employee as any).designation?.name || '',
        p.basicSalary, p.grossEarnings, p.pfEmployee, p.esiEmployee, p.tds, p.totalDeductions, p.netPay,
      ]);
    });
    ws.columns.forEach(c => { c.width = 16; });
    return wb.xlsx.writeBuffer();
  }
}

export const payrollService = new PayrollService();
