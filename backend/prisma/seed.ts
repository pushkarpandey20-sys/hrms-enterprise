import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper to compute salary components from CTC
function computeSalaryComponents(ctcMonthly: number) {
  const basic = Math.round(ctcMonthly * 0.40);
  const hra = Math.round(basic * 0.50);
  const da = Math.round(basic * 0.10);
  const grossBeforeSA = basic + hra + da;
  const pfEmployee = Math.round(basic * 0.12);
  const esiEmployee = Math.round(grossBeforeSA * 0.0075);
  const pt = 200;
  const sa = ctcMonthly - grossBeforeSA - pfEmployee - esiEmployee - pt;
  return { basic, hra, da, sa: Math.max(sa, 0), pfEmployee, esiEmployee, pt };
}

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
  const [cto, swe, hm, se, pm] = await Promise.all([
    findOrCreateDesignation('CTO', 10),
    findOrCreateDesignation('Software Engineer', 3),
    findOrCreateDesignation('HR Manager', 5),
    findOrCreateDesignation('Senior Engineer', 6),
    findOrCreateDesignation('Product Manager', 7),
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
      joiningDate: new Date('2020-01-01T00:00:00.000Z'), status: 'ACTIVE', employmentType: 'FULL_TIME',
      dateOfBirth: new Date('1985-06-15T00:00:00.000Z'),
      personalPhone: '+91-9876543210',
      gender: 'MALE',
      city: 'Bengaluru', state: 'Karnataka', country: 'India',
      panNumber: 'ABCDE1234F',
      aadharNumber: '1234-5678-9012',
      bankName: 'HDFC Bank',
      bankAccountNo: '50100123456789',
      bankIfscCode: 'HDFC0001234',
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
      joiningDate: new Date('2021-03-15T00:00:00.000Z'), status: 'ACTIVE', employmentType: 'FULL_TIME',
      dateOfBirth: new Date('1990-08-22T00:00:00.000Z'),
      personalPhone: '+91-9123456789',
      gender: 'FEMALE',
      city: 'Bengaluru', state: 'Karnataka', country: 'India',
      panNumber: 'BCDEF2345G',
      bankName: 'ICICI Bank',
      bankAccountNo: '000901234567',
      bankIfscCode: 'ICIC0001234',
    },
  });
  const hrPasswordHash = await bcrypt.hash('Hr@123456', 12);
  await prisma.user.upsert({
    where: { email: 'hr@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: hrEmployee.id, email: 'hr@wheeley.in', passwordHash: hrPasswordHash, role: 'HR_ADMIN' },
  });

  // Employee user - Software Engineer
  const empEmployee = await prisma.employee.upsert({
    where: { employeeCode: 'EMP0003' },
    update: {},
    create: {
      organizationId: org.id, employeeCode: 'EMP0003',
      firstName: 'Rahul', lastName: 'Verma',
      workEmail: 'rahul@wheeley.in',
      departmentId: eng.id, designationId: swe.id,
      joiningDate: new Date('2022-06-01T00:00:00.000Z'), status: 'ACTIVE', employmentType: 'FULL_TIME',
      dateOfBirth: new Date('1995-03-10T00:00:00.000Z'),
      personalPhone: '+91-9234567890',
      gender: 'MALE',
      city: 'Noida', state: 'Uttar Pradesh', country: 'India',
      panNumber: 'CDEFG3456H',
      bankName: 'SBI',
      bankAccountNo: '123456789012',
      bankIfscCode: 'SBIN0001234',
    },
  });
  const empPasswordHash = await bcrypt.hash('Emp@123456', 12);
  await prisma.user.upsert({
    where: { email: 'rahul@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: empEmployee.id, email: 'rahul@wheeley.in', passwordHash: empPasswordHash, role: 'EMPLOYEE' },
  });

  // Additional employees
  const emp4 = await prisma.employee.upsert({
    where: { employeeCode: 'EMP0004' },
    update: {},
    create: {
      organizationId: org.id, employeeCode: 'EMP0004',
      firstName: 'Anjali', lastName: 'Singh',
      workEmail: 'anjali@wheeley.in',
      departmentId: eng.id, designationId: se.id,
      managerId: superAdmin.id,
      joiningDate: new Date('2021-09-01T00:00:00.000Z'), status: 'ACTIVE', employmentType: 'FULL_TIME',
      dateOfBirth: new Date('1992-11-05T00:00:00.000Z'),
      personalPhone: '+91-9345678901',
      gender: 'FEMALE',
      city: 'Bengaluru', state: 'Karnataka', country: 'India',
      panNumber: 'DEFGH4567I',
      bankName: 'Axis Bank',
      bankAccountNo: '9120001234567',
      bankIfscCode: 'UTIB0001234',
    },
  });
  const emp4Hash = await bcrypt.hash('Emp@123456', 12);
  await prisma.user.upsert({
    where: { email: 'anjali@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: emp4.id, email: 'anjali@wheeley.in', passwordHash: emp4Hash, role: 'EMPLOYEE' },
  });

  const emp5 = await prisma.employee.upsert({
    where: { employeeCode: 'EMP0005' },
    update: {},
    create: {
      organizationId: org.id, employeeCode: 'EMP0005',
      firstName: 'Arjun', lastName: 'Mehta',
      workEmail: 'arjun@wheeley.in',
      departmentId: sales.id, designationId: pm.id,
      managerId: superAdmin.id,
      joiningDate: new Date('2020-07-15T00:00:00.000Z'), status: 'ACTIVE', employmentType: 'FULL_TIME',
      dateOfBirth: new Date('1988-07-25T00:00:00.000Z'),
      personalPhone: '+91-9456789012',
      gender: 'MALE',
      city: 'Gurugram', state: 'Haryana', country: 'India',
      panNumber: 'EFGHI5678J',
      bankName: 'Kotak Bank',
      bankAccountNo: '7210012345',
      bankIfscCode: 'KKBK0001234',
    },
  });
  const emp5Hash = await bcrypt.hash('Emp@123456', 12);
  await prisma.user.upsert({
    where: { email: 'arjun@wheeley.in' },
    update: {},
    create: { organizationId: org.id, employeeId: emp5.id, email: 'arjun@wheeley.in', passwordHash: emp5Hash, role: 'MANAGER' },
  });

  // ── Leave balances for all active employees (current year) ──────────────────
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

  // ── Salary Structures ────────────────────────────────────────────────────────
  const payrollComponents = await prisma.payrollComponent.findMany({
    where: { organizationId: org.id },
  });
  const compMap = Object.fromEntries(payrollComponents.map(c => [c.code, c]));

  const ctcMap: Record<string, number> = {
    [superAdmin.id]: 200000,  // ₹20 LPA
    [hrEmployee.id]: 150000,  // ₹18 LPA
    [empEmployee.id]: 100000, // ₹12 LPA
    [emp4.id]: 130000,        // ₹15.6 LPA
    [emp5.id]: 160000,        // ₹19.2 LPA
  };

  for (const [empId, ctcMonthly] of Object.entries(ctcMap)) {
    // Check if salary structure already exists
    const existing = await prisma.salaryStructure.findFirst({
      where: { employeeId: empId, isActive: true },
    });
    if (!existing) {
      const breakdown = computeSalaryComponents(ctcMonthly);
      const structure = await prisma.salaryStructure.create({
        data: {
          employeeId: empId,
          ctc: ctcMonthly * 12,
          effectiveFrom: new Date('2024-04-01T00:00:00.000Z'),
          isActive: true,
        },
      });

      // Add components
      const componentData = [
        { code: 'BASIC', monthly: breakdown.basic },
        { code: 'HRA', monthly: breakdown.hra },
        { code: 'DA', monthly: breakdown.da },
        { code: 'SA', monthly: breakdown.sa },
        { code: 'PF_EMPLOYEE', monthly: breakdown.pfEmployee },
        { code: 'ESI_EMPLOYEE', monthly: breakdown.esiEmployee },
        { code: 'PT', monthly: breakdown.pt },
      ];

      for (const cd of componentData) {
        const comp = compMap[cd.code];
        if (comp) {
          await prisma.salaryComponent.create({
            data: {
              salaryStructureId: structure.id,
              componentId: comp.id,
              monthlyAmount: cd.monthly,
              annualAmount: cd.monthly * 12,
            },
          });
        }
      }
    }
  }
  console.log('✅ Salary structures seeded');

  // ── Sample Documents ─────────────────────────────────────────────────────────
  const docData = [
    { employeeId: empEmployee.id, name: 'Aadhaar Card', documentType: 'AADHAR' as const, fileUrl: 'https://example.com/docs/aadhar.pdf', fileName: 'aadhar.pdf', isVerified: true },
    { employeeId: empEmployee.id, name: 'PAN Card', documentType: 'PAN' as const, fileUrl: 'https://example.com/docs/pan.pdf', fileName: 'pan.pdf', isVerified: true },
    { employeeId: empEmployee.id, name: 'Offer Letter', documentType: 'OFFER_LETTER' as const, fileUrl: 'https://example.com/docs/offer.pdf', fileName: 'offer_letter.pdf', isVerified: true },
    { employeeId: hrEmployee.id, name: 'Aadhaar Card', documentType: 'AADHAR' as const, fileUrl: 'https://example.com/docs/aadhar.pdf', fileName: 'aadhar.pdf', isVerified: true },
    { employeeId: hrEmployee.id, name: 'PAN Card', documentType: 'PAN' as const, fileUrl: 'https://example.com/docs/pan.pdf', fileName: 'pan.pdf', isVerified: false },
    { employeeId: emp4.id, name: 'Aadhaar Card', documentType: 'AADHAR' as const, fileUrl: 'https://example.com/docs/aadhar.pdf', fileName: 'aadhar.pdf', isVerified: true },
    { employeeId: emp5.id, name: 'Aadhaar Card', documentType: 'AADHAR' as const, fileUrl: 'https://example.com/docs/aadhar.pdf', fileName: 'aadhar.pdf', isVerified: true },
    { employeeId: emp5.id, name: 'Offer Letter', documentType: 'OFFER_LETTER' as const, fileUrl: 'https://example.com/docs/offer.pdf', fileName: 'offer_letter.pdf', isVerified: true },
  ];

  for (const doc of docData) {
    // Only create if not already exists (check by employeeId + documentType + fileName)
    const existingDoc = await prisma.employeeDocument.findFirst({
      where: { employeeId: doc.employeeId, documentType: doc.documentType, fileName: doc.fileName },
    });
    if (!existingDoc) {
      await prisma.employeeDocument.create({ data: doc });
    }
  }
  console.log('✅ Employee documents seeded');

  // ── WiFi Hotspots ────────────────────────────────────────────────────────────
  const hotspotData = [
    { id: 'hs-ho', name: 'Head Office', ssid: 'Wheeley-HO', locationName: 'Koramangala, Bengaluru', bssid: 'AA:BB:CC:DD:EE:01' },
    { id: 'hs-noida', name: 'Noida Office', ssid: 'Wheeley-Noida', locationName: 'Sector 62, Noida', bssid: 'AA:BB:CC:DD:EE:02' },
    { id: 'hs-ggn', name: 'Gurugram Office', ssid: 'Wheeley-GGN', locationName: 'Cyber City, Gurugram', bssid: 'AA:BB:CC:DD:EE:03' },
  ];

  for (const hs of hotspotData) {
    const existing = await prisma.wifiHotspot.findFirst({ where: { id: hs.id } });
    if (!existing) {
      await prisma.wifiHotspot.create({ data: { ...hs, organizationId: org.id } });
    }
  }
  console.log('✅ WiFi hotspots seeded');

  // ── GPS GeoFences ────────────────────────────────────────────────────────────
  const fenceData = [
    { id: 'gf-ho', name: 'Head Office', latitude: 12.9352, longitude: 77.6245, radius: 300, address: 'Koramangala, Bengaluru - 560034' },
    { id: 'gf-noida', name: 'Noida Office', latitude: 28.6139, longitude: 77.3495, radius: 300, address: 'Sector 62, Noida - 201309' },
    { id: 'gf-ggn', name: 'Gurugram Office', latitude: 28.4595, longitude: 77.0266, radius: 300, address: 'Cyber City, Gurugram - 122002' },
  ];

  for (const gf of fenceData) {
    const existing = await prisma.geoFence.findFirst({ where: { id: gf.id } });
    if (!existing) {
      await prisma.geoFence.create({ data: { ...gf, organizationId: org.id } });
    }
  }
  console.log('✅ GPS geofences seeded');

  console.log('✅ Seed complete');
}

main().catch(console.error).finally(() => prisma.$disconnect());
