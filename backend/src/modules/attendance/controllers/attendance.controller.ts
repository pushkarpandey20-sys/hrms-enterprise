import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { attendanceService } from '../services/attendance.service';
import { z } from 'zod';

const clockInSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  accuracy: z.number().optional(),
  wifiSsid: z.string().optional(),
  source: z.enum(['APP_GPS', 'APP_WIFI', 'APP_FACE', 'WEB', 'MANUAL']).default('WEB'),
});

export const attendanceController = {
  clockIn: asyncHandler(async (req: Request, res: Response) => {
    const data = clockInSchema.parse(req.body);
    const result = await attendanceService.clockIn(
      req.user!.employeeId!,
      req.user!.organizationId,
      { ...data, selfieBuffer: req.file?.buffer },
    );
    res.json({ success: true, data: result });
  }),

  clockOut: asyncHandler(async (req: Request, res: Response) => {
    const result = await attendanceService.clockOut(
      req.user!.employeeId!,
      { latitude: req.body.latitude, longitude: req.body.longitude, selfieBuffer: req.file?.buffer },
    );
    res.json({ success: true, data: result });
  }),

  getMyAttendance: asyncHandler(async (req: Request, res: Response) => {
    const { records, total } = await attendanceService.getByEmployee(req.user!.employeeId!, req);
    res.json({ success: true, data: records, total });
  }),

  getEmployeeAttendance: asyncHandler(async (req: Request, res: Response) => {
    const { records, total } = await attendanceService.getByEmployee(req.params.employeeId, req);
    res.json({ success: true, data: records, total });
  }),

  dashboard: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.getRealtimeDashboard(req.user!.organizationId);
    res.json({ success: true, data });
  }),

  adminOverride: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.adminOverride({
      ...req.body,
      approvedById: req.user!.userId,
    });
    res.json({ success: true, data });
  }),

  exportRegister: asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate, departmentId } = req.query;
    const buffer = await attendanceService.exportAttendanceRegister(
      req.user!.organizationId,
      startDate as string,
      endDate as string,
      departmentId as string,
    );
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="attendance.xlsx"');
    res.send(buffer);
  }),

  bulkUpload: asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new Error('No file uploaded');
    const results = await attendanceService.bulkUploadAttendance(req.user!.organizationId, req.file.buffer);
    res.json({ success: true, data: results });
  }),
};
