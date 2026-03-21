import { prisma } from '../../../config/database';
import { ApiError } from '../../../shared/utils/ApiError';
import { getPaginationOptions } from '../../../shared/utils/pagination';
import { cloudinary } from '../../../config/cloudinary';
import bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import { Request } from 'express';

export class EmployeeService {
  async list(orgId: string, req: Request) {
    const { skip, limit, sortBy, sortOrder } = getPaginationOptions(req);
    const { search, departmentId, designationId, status, employmentType } = req.query;

    const where: any = {
      organizationId: orgId,
      ...(status && { status }),
      ...(departmentId && { departmentId: departmentId as string }),
      ...(designationId && { designationId: designationId as string }),
      ...(employmentType && { employmentType }),
      ...(search && {
        OR: [
          { firstName: { contains: search as string, mode: 'insensitive' } },
          { lastName: { contains: search as string, mode: 'insensitive' } },
          { workEmail: { contains: search as string, mode: 'insensitive' } },
          { employeeCode: { contains: search as string, mode: 'insensitive' } },
        ],
      }),
    };

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          department: { select: { name: true } },
          designation: { select: { name: true } },
          manager: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.employee.count({ where }),
    ]);

    return { employees, total };
  }

  async getById(id: string, orgId: string) {
    const emp = await prisma.employee.findFirst({
      where: { id, organizationId: orgId },
      include: {
        department: true,
        designation: true,
        manager: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
        emergencyContacts: true,
        documents: true,
        assetAssignments: { where: { isActive: true }, include: { asset: true } },
        leaveBalances: { include: { leaveType: true } },
        user: { select: { email: true, role: true, isActive: true, isMfaEnabled: true } },
        salaryStructures: { where: { isActive: true }, include: { components: { include: { component: true } } } },
        customFieldValues: { include: { field: true } },
      },
    });
    if (!emp) throw ApiError.notFound('Employee not found');
    return emp;
  }

  async create(orgId: string, data: any, photoFile?: Express.Multer.File) {
    // Generate employee code
    const count = await prisma.employee.count({ where: { organizationId: orgId } });
    const employeeCode = data.employeeCode || `EMP${String(count + 1).padStart(4, '0')}`;

    // Check duplicate email
    const existing = await prisma.employee.findFirst({ where: { workEmail: data.workEmail } });
    if (existing) throw ApiError.conflict('Work email already in use');

    let photoUrl: string | undefined;
    if (photoFile) {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'hrms/employees', resource_type: 'image' },
          (err, res) => err ? reject(err) : resolve(res as any),
        ).end(photoFile.buffer);
      });
      photoUrl = result.secure_url;
    }

    const employee = await prisma.employee.create({
      data: {
        ...data,
        organizationId: orgId,
        employeeCode,
        photoUrl,
      },
    });

    // Create user account
    if (data.createUser !== false) {
      const passwordHash = await bcrypt.hash(data.workEmail.split('@')[0] + '@123', 12);
      await prisma.user.create({
        data: {
          organizationId: orgId,
          employeeId: employee.id,
          email: data.workEmail,
          passwordHash,
          role: data.role || 'EMPLOYEE',
        },
      });
    }

    return employee;
  }

  async update(id: string, orgId: string, data: any, photoFile?: Express.Multer.File) {
    const existing = await prisma.employee.findFirst({ where: { id, organizationId: orgId } });
    if (!existing) throw ApiError.notFound('Employee not found');

    let photoUrl = existing.photoUrl;
    if (photoFile) {
      const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'hrms/employees', resource_type: 'image' },
          (err, res) => err ? reject(err) : resolve(res as any),
        ).end(photoFile.buffer);
      });
      photoUrl = result.secure_url;
    }

    return prisma.employee.update({
      where: { id },
      data: { ...data, photoUrl },
    });
  }

  async updateStatus(id: string, orgId: string, status: any, reason?: string) {
    const emp = await prisma.employee.findFirst({ where: { id, organizationId: orgId } });
    if (!emp) throw ApiError.notFound('Employee not found');
    return prisma.employee.update({
      where: { id },
      data: { status, ...(status === 'TERMINATED' || status === 'RESIGNED' ? { relievingDate: new Date() } : {}) },
    });
  }

  async getOrgChart(orgId: string) {
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, status: 'ACTIVE' },
      select: {
        id: true, firstName: true, lastName: true, photoUrl: true,
        managerId: true,
        designation: { select: { name: true } },
        department: { select: { name: true } },
      },
    });
    return employees;
  }

  async bulkImport(orgId: string, buffer: Buffer) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.worksheets[0];

    const results: { row: number; success: boolean; error?: string; employeeCode?: string }[] = [];
    const rows: any[] = [];

    sheet.eachRow((row, rowNum) => {
      if (rowNum === 1) return; // skip header
      const values = row.values as any[];
      rows.push({
        rowNum,
        firstName: values[1],
        lastName: values[2],
        workEmail: values[3],
        departmentName: values[4],
        designationName: values[5],
        joiningDate: values[6],
        employmentType: values[7] || 'FULL_TIME',
        personalPhone: values[8],
      });
    });

    for (const row of rows) {
      try {
        const dept = row.departmentName
          ? await prisma.department.findFirst({ where: { name: row.departmentName, organizationId: orgId } })
          : null;
        const desig = row.designationName
          ? await prisma.designation.findFirst({ where: { name: row.designationName, organizationId: orgId } })
          : null;

        const emp = await this.create(orgId, {
          firstName: row.firstName,
          lastName: row.lastName,
          workEmail: row.workEmail,
          departmentId: dept?.id,
          designationId: desig?.id,
          joiningDate: row.joiningDate ? new Date(row.joiningDate) : new Date(),
          employmentType: row.employmentType,
          personalPhone: row.personalPhone,
        });
        results.push({ row: row.rowNum, success: true, employeeCode: emp.employeeCode });
      } catch (err: any) {
        results.push({ row: row.rowNum, success: false, error: err.message });
      }
    }

    return results;
  }

  async exportExcel(orgId: string, fields: string[]) {
    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      include: {
        department: { select: { name: true } },
        designation: { select: { name: true } },
      },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Employees');

    const defaultFields = ['employeeCode', 'firstName', 'lastName', 'workEmail', 'department', 'designation', 'joiningDate', 'status'];
    const exportFields = fields.length ? fields : defaultFields;

    sheet.addRow(exportFields.map(f => f.toUpperCase().replace(/_/g, ' ')));
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3B82F6' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const emp of employees) {
      const row: any[] = exportFields.map(f => {
        if (f === 'department') return (emp as any).department?.name || '';
        if (f === 'designation') return (emp as any).designation?.name || '';
        if (f === 'joiningDate') return emp.joiningDate?.toLocaleDateString() || '';
        return (emp as any)[f] || '';
      });
      sheet.addRow(row);
    }

    sheet.columns.forEach(col => { col.width = 20; });

    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }
}

export const employeeService = new EmployeeService();
