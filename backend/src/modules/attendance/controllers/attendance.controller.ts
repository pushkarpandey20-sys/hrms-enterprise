import { Request, Response } from 'express';
import { asyncHandler } from '../../../shared/utils/asyncHandler';
import { attendanceService } from '../services/attendance.service';
import { z } from 'zod';

const clockInSchema = z.object({
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  accuracy: z.coerce.number().optional(),
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
      {
        latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
        longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
        selfieBuffer: req.file?.buffer,
      },
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

  // ─── Hotspot Management ───────────────────────────────────────────────────────
  listHotspots: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.listHotspots(req.user!.organizationId);
    res.json({ success: true, data });
  }),

  createHotspot: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.createHotspot(req.user!.organizationId, req.body);
    res.status(201).json({ success: true, data });
  }),

  updateHotspot: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.updateHotspot(req.params.id, req.user!.organizationId, req.body);
    res.json({ success: true, data });
  }),

  deleteHotspot: asyncHandler(async (req: Request, res: Response) => {
    await attendanceService.deleteHotspot(req.params.id);
    res.json({ success: true, message: 'Hotspot deleted' });
  }),

  assignHotspot: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.assignHotspotToEmployee(req.params.employeeId, req.params.hotspotId);
    res.json({ success: true, data });
  }),

  removeHotspot: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.removeHotspotFromEmployee(req.params.employeeId, req.params.hotspotId);
    res.json({ success: true, data });
  }),

  getEmployeeHotspots: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.getEmployeeHotspots(req.params.employeeId);
    res.json({ success: true, data });
  }),

  // ─── GeoFence Management ─────────────────────────────────────────────────────
  listGeoFences: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.listGeoFences(req.user!.organizationId);
    res.json({ success: true, data });
  }),

  createGeoFence: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.createGeoFence(req.user!.organizationId, req.body);
    res.status(201).json({ success: true, data });
  }),

  updateGeoFence: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.updateGeoFence(req.params.id, req.body);
    res.json({ success: true, data });
  }),

  deleteGeoFence: asyncHandler(async (req: Request, res: Response) => {
    await attendanceService.deleteGeoFence(req.params.id);
    res.json({ success: true, message: 'GeoFence deleted' });
  }),

  assignGeoFence: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.assignGeoFenceToEmployee(req.params.employeeId, req.params.fenceId);
    res.json({ success: true, data });
  }),

  removeGeoFence: asyncHandler(async (req: Request, res: Response) => {
    const data = await attendanceService.removeGeoFenceFromEmployee(req.params.employeeId, req.params.fenceId);
    res.json({ success: true, data });
  }),
};
