import { prisma } from '../../../config/database';
import { ApiError } from '../../../shared/utils/ApiError';
import { cloudinary } from '../../../config/cloudinary';
import { notificationService } from '../../notifications/services/notification.service';
import ExcelJS from 'exceljs';
import winston from 'winston';

const logger = winston.createLogger({ transports: [new winston.transports.Console()] });

export class LeaveService {
  async applyLeave(employeeId: string, data: {
    leaveTypeId: string; startDate: string; endDate: string;
    reason: string; isHalfDay?: boolean; halfDayPeriod?: string;
    attachmentBuffer?: Buffer;
  }) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const totalDays = data.isHalfDay ? 0.5 : Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check balance
    const year = start.getFullYear();
    const balance = await prisma.leaveBalance.findFirst({
      where: { employeeId, leaveTypeId: data.leaveTypeId, year },
    });
    if (!balance || balance.remainingDays < totalDays) {
      throw ApiError.badRequest('Insufficient leave balance');
    }

    // Check overlapping
    const overlap = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING', 'MGR_APPROVED', 'APPROVED'] },
        OR: [
          { startDate: { lte: end }, endDate: { gte: start } },
        ],
      },
    });
    if (overlap) throw ApiError.conflict('Leave request overlaps with existing leave');

    let attachmentUrl: string | undefined;
    if (data.attachmentBuffer) {
      try {
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'hrms/leave-attachments' },
            (err, res) => err ? reject(err) : resolve(res as any),
          ).end(data.attachmentBuffer);
        });
        attachmentUrl = result.secure_url;
      } catch (err) {
        logger.warn('Leave attachment upload failed (non-fatal):', err);
      }
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        employeeId, leaveTypeId: data.leaveTypeId,
        startDate: start, endDate: end, totalDays,
        isHalfDay: data.isHalfDay || false,
        halfDayPeriod: data.halfDayPeriod as any,
        reason: data.reason, attachmentUrl,
      },
      include: { employee: { include: { manager: true } }, leaveType: true },
    });

    // Update pending days
    await prisma.leaveBalance.update({
      where: { id: balance.id },
      data: { pendingDays: { increment: totalDays } },
    });

    // Notify manager (non-fatal)
    try {
      if (leave.employee.managerId) {
        const managerUser = await prisma.user.findFirst({ where: { employeeId: leave.employee.managerId } });
        if (managerUser) {
          await notificationService.create({
            userId: managerUser.id,
            title: 'New Leave Request',
            message: `${leave.employee.firstName} has applied for ${leave.leaveType.name} from ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`,
            type: 'LEAVE',
            referenceId: leave.id,
          });
        }
      }
    } catch (err) {
      logger.warn('Manager notification failed (non-fatal):', err);
    }

    return leave;
  }

  async processLeave(leaveId: string, action: 'APPROVE' | 'REJECT', approvedById: string, role: string, note?: string) {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: true, leaveType: true },
    });
    if (!leave) throw ApiError.notFound('Leave request not found');

    let newStatus = leave.status;
    const updateData: any = {};

    if (role === 'MANAGER' && leave.status === 'PENDING') {
      newStatus = action === 'APPROVE' ? 'MGR_APPROVED' : 'REJECTED';
      updateData.approvedByMgrId = approvedById;
      updateData.mgrApprovedAt = new Date();
      updateData.managerNote = note;
    } else if ((role === 'HR_ADMIN' || role === 'SUPER_ADMIN') && leave.status === 'MGR_APPROVED') {
      newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      updateData.approvedByHrId = approvedById;
      updateData.hrApprovedAt = new Date();
      updateData.hrNote = note;
    } else if (role === 'HR_ADMIN' || role === 'SUPER_ADMIN') {
      newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      updateData.approvedByHrId = approvedById;
      updateData.hrApprovedAt = new Date();
      updateData.hrNote = note;
    } else {
      throw ApiError.forbidden('Not authorized to process this leave');
    }

    updateData.status = newStatus;
    const updated = await prisma.leaveRequest.update({ where: { id: leaveId }, data: updateData });

    // Update balance
    const year = leave.startDate.getFullYear();
    const balance = await prisma.leaveBalance.findFirst({
      where: { employeeId: leave.employeeId, leaveTypeId: leave.leaveTypeId, year },
    });
    if (balance) {
      if (newStatus === 'APPROVED') {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            usedDays: { increment: leave.totalDays },
            pendingDays: { decrement: leave.totalDays },
            remainingDays: { decrement: leave.totalDays },
          },
        });
        // Update attendance records to ON_LEAVE
        const current = new Date(leave.startDate);
        while (current <= leave.endDate) {
          const d = new Date(current);
          d.setHours(0, 0, 0, 0);
          await prisma.attendance.upsert({
            where: { employeeId_date: { employeeId: leave.employeeId, date: d } },
            create: { employeeId: leave.employeeId, date: d, status: 'ON_LEAVE', source: 'MANUAL' },
            update: { status: 'ON_LEAVE' },
          });
          current.setDate(current.getDate() + 1);
        }
      } else if (newStatus === 'REJECTED') {
        await prisma.leaveBalance.update({
          where: { id: balance.id },
          data: { pendingDays: { decrement: leave.totalDays } },
        });
      }
    }

    // Notify employee (non-fatal)
    try {
      const empUser = await prisma.user.findFirst({ where: { employeeId: leave.employeeId } });
      if (empUser) {
        await notificationService.create({
          userId: empUser.id,
          title: `Leave ${action === 'APPROVE' ? 'Approved' : 'Rejected'}`,
          message: `Your ${leave.leaveType.name} leave from ${leave.startDate.toLocaleDateString()} has been ${action === 'APPROVE' ? 'approved' : 'rejected'}`,
          type: 'LEAVE',
          referenceId: leaveId,
        });
      }
    } catch (err) {
      logger.warn('Employee notification failed (non-fatal):', err);
    }

    return updated;
  }

  async getTeamCalendar(orgId: string, month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return prisma.leaveRequest.findMany({
      where: {
        employee: { organizationId: orgId },
        status: { in: ['APPROVED', 'MGR_APPROVED'] },
        OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
      },
      include: {
        employee: { select: { firstName: true, lastName: true, photoUrl: true, department: { select: { name: true } } } },
        leaveType: { select: { name: true, color: true } },
      },
    });
  }

  async getBalances(employeeId: string, year: number) {
    return prisma.leaveBalance.findMany({
      where: { employeeId, year },
      include: { leaveType: true },
    });
  }

  async exportLeaveReport(orgId: string, year: number) {
    const leaves = await prisma.leaveRequest.findMany({
      where: { employee: { organizationId: orgId }, startDate: { gte: new Date(year, 0, 1) }, endDate: { lte: new Date(year, 11, 31) } },
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true } }, leaveType: true },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Leave Report');
    ws.addRow(['Employee Code', 'Name', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Applied On']);
    ws.getRow(1).font = { bold: true };
    leaves.forEach(l => {
      ws.addRow([l.employee.employeeCode, `${l.employee.firstName} ${l.employee.lastName}`, l.leaveType.name, l.startDate.toLocaleDateString(), l.endDate.toLocaleDateString(), l.totalDays, l.status, l.createdAt.toLocaleDateString()]);
    });
    ws.columns.forEach(c => { c.width = 18; });
    return wb.xlsx.writeBuffer();
  }
}

export const leaveService = new LeaveService();
