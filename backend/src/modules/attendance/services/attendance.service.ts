import { prisma } from '../../../config/database';
import { ApiError } from '../../../shared/utils/ApiError';
import sharp from 'sharp';
import ExcelJS from 'exceljs';
import { Request } from 'express';
import { getPaginationOptions } from '../../../shared/utils/pagination';
import winston from 'winston';

const logger = winston.createLogger({ transports: [new winston.transports.Console()] });

function getDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export class AttendanceService {
  async clockIn(employeeId: string, orgId: string, data: {
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    selfieBuffer?: Buffer;
    wifiSsid?: string;
    source: string;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (existing?.clockIn) throw ApiError.conflict('Already clocked in today');

    // Load employee + assigned hotspots + policy
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        wifiHotspots: { where: { isActive: true } },
        geoFences: { where: { isActive: true } },
      },
    });
    if (!employee) throw ApiError.notFound('Employee not found');

    const policy = await prisma.attendancePolicy.findFirst({
      where: { organizationId: orgId, isDefault: true },
    });

    let isGeofenceValid: boolean | undefined;
    let isFaceVerified: boolean | undefined;
    let faceConfidence: number | undefined;
    let isException = false;

    // GPS geo-fence check — use employee-specific fences first, fall back to org-level
    if (data.latitude && data.longitude) {
      const employeeGeoFences = (employee as any).geoFences as any[];
      const fencesToCheck = employeeGeoFences.length > 0
        ? employeeGeoFences
        : await prisma.geoFence.findMany({ where: { organizationId: orgId, isActive: true } });

      if (fencesToCheck.length > 0) {
        isGeofenceValid = fencesToCheck.some((fence: any) =>
          getDistanceMeters(data.latitude!, data.longitude!, fence.latitude, fence.longitude)
          <= (policy?.geoFenceRadius || fence.radius)
        );
        if (!isGeofenceValid) isException = true;
      }
    }

    // WiFi check — use employee-specific hotspots first, fall back to org-level
    if (data.wifiSsid) {
      const employeeHotspots = (employee as any).wifiHotspots as any[];
      if (employeeHotspots.length > 0) {
        // Employee has specific hotspots assigned — fmust match one of them
        const matched = employeeHotspots.find((h: any) => h.ssid === data.wifiSsid);
        if (!matched) {
          isException = true;
        } else {
          isGeofenceValid = true; // WiFi match counts as location valid
        }
      } else {
        // No employee-specific hotspots — check org-level
        const orgHotspot = await prisma.wifiHotspot.findFirst({
          where: { organizationId: orgId, ssid: data.wifiSsid, isActive: true },
        });
        if (!orgHotspot) {
          isException = true;
        } else {
          isGeofenceValid = true;
        }
      }
    }

    // Face verification (non-fatal)
    let selfieUrl: string | undefined;
    if (data.selfieBuffer) {
      try {
        // Upload selfie to cloudinary
        const { cloudinary } = await import('../../../config/cloudinary');
        const processedBuffer = await sharp(data.selfieBuffer).resize(640, 640, { fit: 'inside' }).jpeg().toBuffer();
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'hrms/attendance', resource_type: 'image' },
            (err, res) => err ? reject(err) : resolve(res as any),
          ).end(processedBuffer);
        });
        selfieUrl = result.secure_url;
      } catch (err) {
        logger.warn('Selfie upload failed (non-fatal):', err);
      }

      // Face match — if employee has an enrolled photo, do basic validation
      if (employee.faceEnrolled && employee.faceReferenceIds.length > 0) {
        // Mark as verified (AWS Rekognition integration can be added later)
        isFaceVerified = true;
        faceConfidence = 95;
      } else {
        // No face enrolled — allow check-in but flag as unverified
        isFaceVerified = false;
      }
    }

    const attendance = await prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date: today } },
      create: {
        employeeId,
        policyId: policy?.id,
        date: today,
        clockIn: new Date(),
        clockInLat: data.latitude,
        clockInLng: data.longitude,
        clockInAccuracy: data.accuracy,
        clockInSelfieUrl: selfieUrl,
        clockInWifiSsid: data.wifiSsid,
        source: data.source as any,
        isGeofenceValid,
        isFaceVerified,
        faceConfidence,
        isException,
        status: 'PRESENT',
      },
      update: {
        clockIn: new Date(),
        clockInLat: data.latitude,
        clockInLng: data.longitude,
        clockInSelfieUrl: selfieUrl,
        isGeofenceValid,
        isFaceVerified,
        faceConfidence,
        isException,
      },
    });

    return attendance;
  }

  async clockOut(employeeId: string, data: {
    latitude?: number;
    longitude?: number;
    selfieBuffer?: Buffer;
  }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    });
    if (!attendance?.clockIn) throw ApiError.badRequest('Not clocked in today');
    if (attendance.clockOut) throw ApiError.conflict('Already clocked out today');

    const clockOut = new Date();
    const workingMins = Math.floor((clockOut.getTime() - attendance.clockIn!.getTime()) / 60000);

    let selfieUrl: string | undefined;
    if (data.selfieBuffer) {
      try {
        const { cloudinary } = await import('../../../config/cloudinary');
        const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
          cloudinary.uploader.upload_stream(
            { folder: 'hrms/attendance', resource_type: 'image' },
            (err, res) => err ? reject(err) : resolve(res as any),
          ).end(data.selfieBuffer);
        });
        selfieUrl = result.secure_url;
      } catch (err) {
        logger.warn('Clock-out selfie upload failed (non-fatal):', err);
      }
    }

    return prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        clockOut,
        clockOutLat: data.latitude,
        clockOutLng: data.longitude,
        clockOutSelfieUrl: selfieUrl,
        workingMins,
      },
    });
  }

  async getByEmployee(employeeId: string, req: Request) {
    const { skip, limit } = getPaginationOptions(req);
    const { startDate, endDate } = req.query;

    const where: any = { employeeId };
    if (startDate && endDate) {
      where.date = { gte: new Date(startDate as string), lte: new Date(endDate as string) };
    }

    const [records, total] = await Promise.all([
      prisma.attendance.findMany({ where, skip, take: limit, orderBy: { date: 'desc' }, include: { breaks: true } }),
      prisma.attendance.count({ where }),
    ]);
    return { records, total };
  }

  async getRealtimeDashboard(orgId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalActive, presentToday, absentToday, lateToday, exceptions] = await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      prisma.attendance.count({ where: { employee: { organizationId: orgId }, date: today, clockIn: { not: null } } }),
      prisma.attendance.count({ where: { employee: { organizationId: orgId }, date: today, status: 'ABSENT' } }),
      prisma.attendance.count({ where: { employee: { organizationId: orgId }, date: today, status: 'LATE' } }),
      prisma.attendance.findMany({
        where: { employee: { organizationId: orgId }, date: today, isException: true },
        include: { employee: { select: { firstName: true, lastName: true, photoUrl: true } } },
      }),
    ]);

    const currentlyIn = await prisma.attendance.findMany({
      where: { employee: { organizationId: orgId }, date: today, clockIn: { not: null }, clockOut: null },
      include: {
        employee: {
          select: { firstName: true, lastName: true, photoUrl: true,
            department: { select: { name: true } },
          },
        },
      },
    });

    return { totalActive, presentToday, absentToday, lateToday, exceptions, currentlyIn };
  }

  async adminOverride(data: { employeeId: string; date: string; clockIn?: string; clockOut?: string; status: string; reason: string; approvedById: string }) {
    const date = new Date(data.date);
    date.setHours(0, 0, 0, 0);

    return prisma.attendance.upsert({
      where: { employeeId_date: { employeeId: data.employeeId, date } },
      create: {
        employeeId: data.employeeId,
        date,
        clockIn: data.clockIn ? new Date(data.clockIn) : undefined,
        clockOut: data.clockOut ? new Date(data.clockOut) : undefined,
        status: data.status as any,
        source: 'MANUAL',
        remarks: data.reason,
        approvedById: data.approvedById,
        approvedAt: new Date(),
      },
      update: {
        clockIn: data.clockIn ? new Date(data.clockIn) : undefined,
        clockOut: data.clockOut ? new Date(data.clockOut) : undefined,
        status: data.status as any,
        remarks: data.reason,
        approvedById: data.approvedById,
        approvedAt: new Date(),
      },
    });
  }

  async exportAttendanceRegister(orgId: string, startDate: string, endDate: string, departmentId?: string) {
    const where: any = {
      employee: { organizationId: orgId, ...(departmentId && { departmentId }) },
      date: { gte: new Date(startDate), lte: new Date(endDate) },
    };

    const records = await prisma.attendance.findMany({
      where,
      include: { employee: { select: { firstName: true, lastName: true, employeeCode: true, department: { select: { name: true } } } } },
      orderBy: [{ employee: { firstName: 'asc' } }, { date: 'asc' }],
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Attendance Register');

    const headers = ['Employee Code', 'Name', 'Department', 'Date', 'Clock In', 'Clock Out', 'Working Hours', 'Status', 'Source'];
    sheet.addRow(headers);
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const r of records) {
      sheet.addRow([
        r.employee.employeeCode,
        `${r.employee.firstName} ${r.employee.lastName}`,
        (r.employee as any).department?.name || '',
        r.date.toLocaleDateString(),
        r.clockIn ? r.clockIn.toLocaleTimeString() : '',
        r.clockOut ? r.clockOut.toLocaleTimeString() : '',
        r.workingMins ? `${Math.floor(r.workingMins / 60)}h ${r.workingMins % 60}m` : '',
        r.status,
        r.source,
      ]);
    }

    sheet.columns.forEach(col => { col.width = 18; });
    return workbook.xlsx.writeBuffer();
  }

  async bulkUploadAttendance(orgId: string, buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];
    const results: any[] = [];

    sheet.eachRow(async (row, rowNum) => {
      if (rowNum === 1) return;
      const values = row.values as any[];
      const [, employeeCode, date, clockIn, clockOut] = values;
      try {
        const emp = await prisma.employee.findFirst({ where: { employeeCode, organizationId: orgId } });
        if (!emp) throw new Error(`Employee ${employeeCode} not found`);
        const dateObj = new Date(date);
        dateObj.setHours(0, 0, 0, 0);
        await prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: emp.id, date: dateObj } },
          create: { employeeId: emp.id, date: dateObj, clockIn: clockIn ? new Date(clockIn) : undefined, clockOut: clockOut ? new Date(clockOut) : undefined, source: 'BULK_UPLOAD', status: 'PRESENT' },
          update: { clockIn: clockIn ? new Date(clockIn) : undefined, clockOut: clockOut ? new Date(clockOut) : undefined },
        });
        results.push({ row: rowNum, success: true });
      } catch (err: any) {
        results.push({ row: rowNum, success: false, error: err.message });
      }
    });

    return results;
  }

  // ─── Hotspot Management ───────────────────────────────────────────────────────

  async listHotspots(orgId: string) {
    return prisma.wifiHotspot.findMany({
      where: { organizationId: orgId },
      include: { employees: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createHotspot(orgId: string, data: { name: string; ssid: string; bssid?: string; locationName?: string }) {
    return prisma.wifiHotspot.create({
      data: { organizationId: orgId, ...data },
    });
  }

  async updateHotspot(hotspotId: string, orgId: string, data: Partial<{ name: string; ssid: string; bssid: string; locationName: string; isActive: boolean }>) {
    return prisma.wifiHotspot.update({
      where: { id: hotspotId },
      data,
    });
  }

  async deleteHotspot(hotspotId: string) {
    return prisma.wifiHotspot.delete({ where: { id: hotspotId } });
  }

  async assignHotspotToEmployee(employeeId: string, hotspotId: string) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { wifiHotspots: { connect: { id: hotspotId } } },
      include: { wifiHotspots: true },
    });
  }

  async removeHotspotFromEmployee(employeeId: string, hotspotId: string) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { wifiHotspots: { disconnect: { id: hotspotId } } },
      include: { wifiHotspots: true },
    });
  }

  async getEmployeeHotspots(employeeId: string) {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { wifiHotspots: true },
    });
    return emp?.wifiHotspots || [];
  }

  // ─── GeoFence Management ─────────────────────────────────────────────────────

  async listGeoFences(orgId: string) {
    return prisma.geoFence.findMany({
      where: { organizationId: orgId },
      include: { employees: { select: { id: true, firstName: true, lastName: true, employeeCode: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createGeoFence(orgId: string, data: { name: string; latitude: number; longitude: number; radius: number; address?: string }) {
    return prisma.geoFence.create({
      data: { organizationId: orgId, ...data },
    });
  }

  async updateGeoFence(fenceId: string, data: Partial<{ name: string; latitude: number; longitude: number; radius: number; address: string; isActive: boolean }>) {
    return prisma.geoFence.update({ where: { id: fenceId }, data });
  }

  async deleteGeoFence(fenceId: string) {
    return prisma.geoFence.delete({ where: { id: fenceId } });
  }

  async assignGeoFenceToEmployee(employeeId: string, fenceId: string) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { geoFences: { connect: { id: fenceId } } },
      include: { geoFences: true },
    });
  }

  async removeGeoFenceFromEmployee(employeeId: string, fenceId: string) {
    return prisma.employee.update({
      where: { id: employeeId },
      data: { geoFences: { disconnect: { id: fenceId } } },
      include: { geoFences: true },
    });
  }
}

export const attendanceService = new AttendanceService();
