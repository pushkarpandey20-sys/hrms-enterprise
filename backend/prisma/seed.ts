import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create organization
  const org = await prisma.organization.upsert({
    where: { id: 'org-001' },
    update: {},
    create: {
      id: 'org-001',
      name: 'Wheeley',
      legalName: 'Wheeley Technologies Pvt Ltd',
      email: 'hr@wheeley.in',
      phone: '+91-9999999999',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'India',
    },
  });

  // Departments
  const [eng, hr, finance, sales] = await Promise.all([
    prisma.department.upsert({ where: { organizationId_code: { organizationId: org.id, code: 'ENG' } }, update: {}, create: { organizationId: org.id, name: 'Engineering', code: 'ENG' } }),
    prisma.department.upsert({ where: { organizationId_code: { organizationId: org.id, code: 'HR' } }, update: {}, create: { organizationId: org.id, name: 'Human Resources', code: 'HR' } }),
    prisma.department.upsert({ where: { organizationId_code: { organizationId: org.id, code: 'FIN' } }, update: {}, create: { organizationId: org.id, name: 'Finance', code: 'FIN' } }),
    prisma.department.upsert({ where: { organizationId_code: { organizationId: org.id, code: 'SALES' } }, update: {}, create: { organizationId: org.id, name: 'Sales', code: 'SALES' } }),
  ]);

  // Designations (findOrCreate to avoid duplicates on re-runs)
  async function findOrCreateDesignation(name: string, level: number) {
    const existing = await prisma.designation.findFirst({ where: { organizationId: org.id, name } });
    if (existing) return existing;
    return prisma.designation.create({ data: { organizationId: org.id, name, level } });
  }
  const [cto, swe, hm] = await Promise.all([
    findOrCreateDesignation('CTO', 10),
    findOrCreateDesignation('Software Engineer', 3),
    findOrCreateDesignation('HR Manager', 5),
  ]);

  // Super admin employee
  const superAdmin = await prisma.employee.upsert({
    where: { employeeCode: 'EMP0001' },
    update: {},
    create: {
      organizationId: org.id, employeeCode: 'EMP0001',
      firstName: 'Super', lastName: 'Admin',
      workEmail: 'admin@wheeley.in',
      departmentId: hr.id, designationId: hm.id,
      joiningDate: new Date('2020-01-01'), status: 'ACTIVE', employmentType: 'FULL_TIME',
    },
  });

  const passwordHash = await bcrypt.hash('Admin@123', 12);
  await prisma.user.upsert({
    where: { email: 'admin@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: superAdmin.id, email: 'admin@wheeley.in', passwordHash, role: 'SUPER_ADMIN' },
  });

  // Leave types
  const leaveTypes = [
    { code: 'CL', name: 'Casual Leave', isPaid: true, annualAllocation: 12, color: '#3B82F6' },
    { code: 'SL', name: 'Sick Leave', isPaid: true, annualAllocation: 10, color: '#EF4444' },
    { code: 'EL', name: 'Earned Leave', isPaid: true, isCarryForward: true, maxCarryForward: 15, annualAllocation: 15, color: '#10B981' },
    { code: 'ML', name: 'Maternity Leave', isPaid: true, annualAllocation: 90, color: '#EC4899' },
    { code: 'PL', name: 'Paternity Leave', isPaid: true, annualAllocation: 5, color: '#6366F1' },
  ];

  for (const lt of leaveTypes) {
    await prisma.leaveType.upsert({
      where: { organizationId_code: { organizationId: org.id, code: lt.code } },
      update: {},
      create: { organizationId: org.id, ...lt },
    });
  }

  // Default attendance policy
  await prisma.attendancePolicy.upsert({
    where: { id: 'policy-default' },
    update: {},
    create: {
      id: 'policy-default', organizationId: org.id,
      name: 'Standard Shift', shiftName: 'General Shift',
      shiftStartTime: '09:00', shiftEndTime: '18:00',
      gracePeriodMins: 15, halfDayMins: 240, fullDayMins: 480,
      isDefault: true,
    },
  });

  // Payroll components
  const components = [
    { code: 'BASIC', name: 'Basic Salary', componentType: 'EARNING' as const, calculationType: 'PERCENTAGE' as const, calculationBase: 'CTC', value: 40, sortOrder: 1 },
    { code: 'HRA', name: 'House Rent Allowance', componentType: 'EARNING' as const, calculationType: 'PERCENTAGE' as const, calculationBase: 'BASIC', value: 50, sortOrder: 2 },
    { code: 'DA', name: 'Dearness Allowance', componentType: 'EARNING' as const, calculationType: 'PERCENTAGE' as const, calculationBase: 'BASIC', value: 10, sortOrder: 3 },
    { code: 'SA', name: 'Special Allowance', componentType: 'EARNING' as const, calculationType: 'FORMULA' as const, sortOrder: 4 },
    { code: 'PF_EMPLOYEE', name: 'PF (Employee)', componentType: 'STATUTORY' as const, calculationType: 'PERCENTAGE' as const, calculationBase: 'BASIC', value: 12, sortOrder: 5 },
    { code: 'ESI_EMPLOYEE', name: 'ESI (Employee)', componentType: 'STATUTORY' as const, calculationType: 'PERCENTAGE' as const, calculationBase: 'GROSS', value: 0.75, sortOrder: 6 },
    { code: 'PT', name: 'Professional Tax', componentType: 'STATUTORY' as const, calculationType: 'FIXED' as const, value: 200, sortOrder: 7 },
  ];

  for (const c of components) {
    await prisma.payrollComponent.upsert({
      where: { organizationId_code: { organizationId: org.id, code: c.code } },
      update: {},
      create: { organizationId: org.id, ...c },
    });
  }

  // Asset categories
  await Promise.all([
    prisma.assetCategory.upsert({ where: { id: 'cat-it' }, update: {}, create: { id: 'cat-it', name: 'IT Assets' } }),
    prisma.assetCategory.upsert({ where: { id: 'cat-furniture' }, update: {}, create: { id: 'cat-furniture', name: 'Furniture' } }),
    prisma.assetCategory.upsert({ where: { id: 'cat-vehicle' }, update: {}, create: { id: 'cat-vehicle', name: 'Vehicles' } }),
  ]);

  // HR user
  const hrEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'EMP0002' },
    update: {},
    create: {
      organizationId: org.id, employeeCode: 'EMP0002',
      firstName: 'Priya', lastName: 'Sharma',
      workEmail: 'hr@wheeley.in',
      departmentId: hr.id, designationId: hm.id,
      joiningDate: new Date('2021-03-15'), status: 'ACTIVE', employmentType: 'FULL_TIME',
    },
  });
  const hrPasswordHash = await bcrypt.hash('Hr@123456', 12);
  await prisma.user.upsert({
    where: { email: 'hr@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: hrEmployee.id, email: 'hr@wheeley.in', passwordHash: hrPasswordHash, role: 'HR_ADMIN' },
  });

  // Employee user
  const empEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'EMP0003' },
    update: {},
    create: {
      organizationId: org.id, employeeCode: 'EMP0003',
      firstName: 'Rahul', lastName: 'Verma',
      workEmail: 'rahul@wheeley.in',
      departmentId: eng.id, designationId: swe.id,
      joiningDate: new Date('2022-06-01'), status: 'ACTIVE', employmentType: 'FULL_TIME',
    },
  });
  const empPasswordHash = await bcrypt.hash('Emp@123456', 12);
  await prisma.user.upsert({
    where: { email: 'rahul@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: empEmployee.id, email: 'rahul@wheeley.in', passwordHash: empPasswordHash, role: 'EMPLOYEE' },
  });

  // ── Leave balances for ALL active employees (current year) ───────────────────
  const currentYear = new Date().getFullYear();
  const allEmployees = await prisma.employee.findMany({
    where: { organizationId: org.id, status: 'ACTIVE' },
  });
  const allLeaveTypes = await prisma.leaveType.findMany({
    where: { organizationId: org.id, isActive: true },
  });

  for (const emp of allEmployees) {
    for (const lt of allLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          employeeId_leaveTypeId_year: {
            employeeId: emp.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          employeeId: emp.id,
          leaveTypeId: lt.id,
          year: currentYear,
          totalDays: lt.annualAllocation,
          remainingDays: lt.annualAllocation,
          usedDays: 0,
          pendingDays: 0,
          carriedOver: 0,
        },
      });
    }
  }
  console.log(`✅ Leave balances seeded for ${allEmployees.length} employees`);

  console.log('✅ Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
