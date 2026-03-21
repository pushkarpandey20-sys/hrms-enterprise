import { prisma } from '../../../config/database';
import { ApiError } from '../../../shared/utils/ApiError';
import QRCode from 'qrcode';
import ExcelJS from 'exceljs';
import { cloudinary } from '../../../config/cloudinary';

export class AssetService {
  async create(orgId: string, data: any) {
    const count = await prisma.asset.count({ where: { organizationId: orgId } });
    const assetCode = data.assetCode || `AST${String(count + 1).padStart(4, '0')}`;

    const asset = await prisma.asset.create({
      data: { ...data, organizationId: orgId, assetCode },
    });

    // Generate QR code
    const qrData = JSON.stringify({ assetId: asset.id, code: asset.assetCode, name: asset.name });
    const qrBuffer = await QRCode.toBuffer(qrData);
    const qrResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'hrms/qrcodes', resource_type: 'image' },
        (err, res) => err ? reject(err) : resolve(res as any),
      ).end(qrBuffer);
    });

    return prisma.asset.update({
      where: { id: asset.id },
      data: { qrCodeUrl: qrResult.secure_url },
    });
  }

  async assign(assetId: string, employeeId: string, assignedById: string, notes?: string) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw ApiError.notFound('Asset not found');
    if (asset.status === 'ASSIGNED') throw ApiError.conflict('Asset already assigned');

    const [assignment] = await prisma.$transaction([
      prisma.assetAssignment.create({
        data: { assetId, employeeId, assignedById, notes, isActive: true },
      }),
      prisma.asset.update({ where: { id: assetId }, data: { status: 'ASSIGNED' } }),
    ]);
    return assignment;
  }

  async returnAsset(assignmentId: string, returnedById: string, conditionIn: any, notes?: string) {
    const assignment = await prisma.assetAssignment.findUnique({
      where: { id: assignmentId },
      include: { asset: true },
    });
    if (!assignment) throw ApiError.notFound('Assignment not found');

    await prisma.$transaction([
      prisma.assetAssignment.update({
        where: { id: assignmentId },
        data: { returnedAt: new Date(), returnedById, conditionIn, notes, isActive: false },
      }),
      prisma.asset.update({
        where: { id: assignment.assetId },
        data: { status: 'AVAILABLE', condition: conditionIn },
      }),
    ]);
  }

  async list(orgId: string, filters: any = {}) {
    const where: any = { organizationId: orgId };
    if (filters.status) where.status = filters.status;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { assetCode: { contains: filters.search, mode: 'insensitive' } },
        { serialNumber: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return prisma.asset.findMany({
      where,
      include: {
        category: true,
        assignments: { where: { isActive: true }, include: { employee: { select: { firstName: true, lastName: true, photoUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async bulkImport(orgId: string, buffer: Buffer) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);
    const ws = wb.worksheets[0];
    const results: any[] = [];
    const rows: any[] = [];

    ws.eachRow((row, rowNum) => {
      if (rowNum === 1) return;
      const v = row.values as any[];
      rows.push({ rowNum, name: v[1], category: v[2], serial: v[3], model: v[4], purchaseCost: v[5] });
    });

    for (const row of rows) {
      try {
        const cat = row.category ? await prisma.assetCategory.findFirst({ where: { name: row.category } }) : null;
        const asset = await this.create(orgId, { name: row.name, categoryId: cat?.id, serialNumber: row.serial, model: row.model, purchaseCost: Number(row.purchaseCost) || 0 });
        results.push({ row: row.rowNum, success: true, assetCode: asset.assetCode });
      } catch (err: any) {
        results.push({ row: row.rowNum, success: false, error: err.message });
      }
    }
    return results;
  }

  async exportRegister(orgId: string) {
    const assets = await this.list(orgId);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Asset Register');
    ws.addRow(['Asset Code', 'Name', 'Category', 'Serial No', 'Model', 'Status', 'Condition', 'Purchase Cost', 'Assigned To']);
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A0F1E' } };
    assets.forEach(a => {
      const assignedTo = (a.assignments as any[])[0]?.employee ? `${(a.assignments as any[])[0].employee.firstName} ${(a.assignments as any[])[0].employee.lastName}` : '';
      ws.addRow([a.assetCode, a.name, (a.category as any)?.name || '', a.serialNumber || '', a.model || '', a.status, a.condition, a.purchaseCost || '', assignedTo]);
    });
    ws.columns.forEach(c => { c.width = 18; });
    return wb.xlsx.writeBuffer();
  }
}

export const assetService = new AssetService();
