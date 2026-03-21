import { prisma } from '../../../config/database';
import { redis } from '../../../config/redis';
import ApiError from '../../../shared/utils/ApiError';
import { ExitType, OffboardStatus, ChecklistStatus, ClearanceStatus, ExitReason } from '@prisma/client';

// Default checklist templates per exit type
const DEFAULT_CHECKLIST: Record<ExitType, { task: string; assignedDept: string }[]> = {
  RESIGNATION: [
    { task: 'Submit resignation letter', assignedDept: 'HR' },
    { task: 'Return laptop & accessories', assignedDept: 'IT' },
    { task: 'Return access card / key fob', assignedDept: 'Administration' },
    { task: 'Knowledge transfer documentation', assignedDept: 'Manager' },
    { task: 'Clear all pending tasks', assignedDept: 'Manager' },
    { task: 'Remove personal data from company devices', assignedDept: 'IT' },
    { task: 'Return company vehicle (if applicable)', assignedDept: 'Administration' },
    { task: 'Settle outstanding expenses', assignedDept: 'Finance' },
    { task: 'NOC from Finance', assignedDept: 'Finance' },
    { task: 'Exit interview scheduled', assignedDept: 'HR' },
  ],
  TERMINATION: [
    { task: 'HR formal termination communication', assignedDept: 'HR' },
    { task: 'Collect all company assets', assignedDept: 'IT' },
    { task: 'Revoke all system access immediately', assignedDept: 'IT' },
    { task: 'Return access card / key fob', assignedDept: 'Administration' },
    { task: 'Legal clearance', assignedDept: 'Legal' },
    { task: 'Final settlement calculation', assignedDept: 'Finance' },
    { task: 'Exit interview (if applicable)', assignedDept: 'HR' },
  ],
  RETIREMENT: [
    { task: 'Retirement benefit calculation', assignedDept: 'HR' },
    { task: 'Superannuation / provident fund processing', assignedDept: 'Finance' },
    { task: 'Knowledge transfer', assignedDept: 'Manager' },
    { task: 'Return company assets', assignedDept: 'IT' },
    { task: 'Exit interview', assignedDept: 'HR' },
    { task: 'Return access card', assignedDept: 'Administration' },
    { task: 'Farewell ceremony planning', assignedDept: 'HR' },
  ],
  CONTRACT_END: [
    { task: 'Contract closure documentation', assignedDept: 'HR' },
    { task: 'Return assets', assignedDept: 'IT' },
    { task: 'NOC from all departments', assignedDept: 'HR' },
    { task: 'Final invoice settlement', assignedDept: 'Finance' },
    { task: 'Exit interview', assignedDept: 'HR' },
  ],
};

export const initiateOffboarding = async (orgId: string, initiatedById: string, data: {
  employeeId: string;
  exitType: ExitType;
  exitDate: Date;
  reason?: ExitReason;
  notes?: string;
}) => {
  // Check no active offboarding exists
  const existing = await prisma.offboardingCase.findFirst({
    where: {
      employeeId: data.employeeId,
      status: { notIn: [OffboardStatus.COMPLETED, OffboardStatus.CANCELLED] },
    },
  });
  if (existing) throw ApiError.conflict('Employee already has an active offboarding case');

  const checklistTemplate = DEFAULT_CHECKLIST[data.exitType];

  const offboarding = await prisma.offboardingCase.create({
    data: {
      employeeId: data.employeeId,
      organizationId: orgId,
      initiatedById,
      exitType: data.exitType,
      exitDate: data.exitDate,
      reason: data.reason,
      notes: data.notes,
      checklist: {
        create: checklistTemplate.map((item, idx) => ({
          task: item.task,
          assignedDept: item.assignedDept,
          order: idx,
        })),
      },
    },
    include: {
      employee: { select: { firstName: true, lastName: true, department: { select: { name: true } } } },
      checklist: { orderBy: { order: 'asc' } },
    },
  });

  return offboarding;
};

export const getOffboardingCase = async (caseId: string, orgId: string) => {
  const offboarding = await prisma.offboardingCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    include: {
      employee: {
        include: {
          department: { select: { name: true } },
          designation: { select: { title: true } },
          user: { select: { email: true } },
        },
      },
      checklist: { orderBy: { order: 'asc' } },
      clearances: {
        include: { signedOffBy: { select: { displayName: true } } },
      },
      exitInterview: true,
      initiatedBy: { select: { displayName: true } },
    },
  });
  if (!offboarding) throw ApiError.notFound('Offboarding case not found');
  return offboarding;
};

export const listOffboardingCases = async (orgId: string, filters: {
  status?: OffboardStatus; page?: number; pageSize?: number;
}) => {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const [cases, total] = await Promise.all([
    prisma.offboardingCase.findMany({
      where: {
        organizationId: orgId,
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        employee: {
          select: {
            firstName: true, lastName: true,
            department: { select: { name: true } },
          },
        },
        _count: { select: { checklist: true, clearances: true } },
      },
      orderBy: { exitDate: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.offboardingCase.count({ where: { organizationId: orgId } }),
  ]);

  return { cases, total, page, pageSize };
};

export const updateChecklistItem = async (itemId: string, orgId: string, userId: string, data: {
  status: ChecklistStatus;
  notes?: string;
}) => {
  const item = await prisma.offboardingChecklistItem.findFirst({
    where: { id: itemId, case: { organizationId: orgId } },
  });
  if (!item) throw ApiError.notFound('Checklist item not found');

  return prisma.offboardingChecklistItem.update({
    where: { id: itemId },
    data: {
      status: data.status,
      notes: data.notes,
      completedAt: data.status === ChecklistStatus.COMPLETED ? new Date() : null,
      completedById: data.status === ChecklistStatus.COMPLETED ? userId : null,
    },
  });
};

export const signOffClearance = async (caseId: string, orgId: string, signedOffById: string, data: {
  department: string;
  status: ClearanceStatus;
  remarks?: string;
}) => {
  const offboarding = await prisma.offboardingCase.findFirst({
    where: { id: caseId, organizationId: orgId },
  });
  if (!offboarding) throw ApiError.notFound('Offboarding case not found');

  return prisma.clearanceSignOff.upsert({
    where: { caseId_department: { caseId, department: data.department } },
    create: {
      caseId,
      department: data.department,
      status: data.status,
      remarks: data.remarks,
      signedOffById,
      signedOffAt: new Date(),
    },
    update: {
      status: data.status,
      remarks: data.remarks,
      signedOffById,
      signedOffAt: new Date(),
    },
  });
};

export const calculateFnF = async (caseId: string, orgId: string) => {
  const offboarding = await prisma.offboardingCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    include: {
      employee: {
        include: {
          payrollRecords: {
            orderBy: { periodEnd: 'desc' },
            take: 1,
          },
          leaveBalances: {
            include: { leaveType: true },
          },
        },
      },
    },
  });
  if (!offboarding) throw ApiError.notFound('Case not found');

  const lastPayroll = offboarding.employee.payrollRecords[0];
  const monthlySalary = Number(lastPayroll?.grossSalary ?? 0);
  const dailyRate = monthlySalary / 30;

  // Calculate days worked in last month up to exit date
  const today = new Date();
  const exitDate = offboarding.exitDate;
  const daysWorked = Math.min(
    Math.ceil((exitDate.getTime() - new Date(exitDate.getFullYear(), exitDate.getMonth(), 1).getTime()) / 86400000),
    30
  );

  // Leave encashment (unused earned leave)
  const earnedLeave = offboarding.employee.leaveBalances.find(lb => lb.leaveType.name.toLowerCase().includes('earned'));
  const leaveEncashment = earnedLeave ? Number(earnedLeave.balance) * dailyRate : 0;

  const fnf = {
    monthlySalary,
    dailyRate,
    daysWorked,
    salaryForDaysWorked: daysWorked * dailyRate,
    leaveEncashment,
    gratuity: monthlySalary > 0 ? (monthlySalary / 26) * 15 : 0, // simplified gratuity
    totalPayable: daysWorked * dailyRate + leaveEncashment,
  };

  // Save FnF calculation
  await prisma.offboardingCase.update({
    where: { id: caseId },
    data: { fnfAmount: fnf.totalPayable },
  });

  return fnf;
};

export const submitExitInterview = async (caseId: string, orgId: string, data: {
  conductedById: string;
  overallSatisfaction: number;
  reasonForLeaving: string;
  likedMost?: string;
  likedLeast?: string;
  improvementSuggestions?: string;
  wouldRecommend: boolean;
  npsScore: number;
  rehireEligible?: boolean;
}) => {
  const offboarding = await prisma.offboardingCase.findFirst({
    where: { id: caseId, organizationId: orgId },
  });
  if (!offboarding) throw ApiError.notFound('Case not found');

  return prisma.exitInterview.upsert({
    where: { caseId },
    create: { ...data, caseId, conductedAt: new Date() },
    update: { ...data, conductedAt: new Date() },
  });
};

export const completeOffboarding = async (caseId: string, orgId: string, userId: string) => {
  const offboarding = await prisma.offboardingCase.findFirst({
    where: { id: caseId, organizationId: orgId },
    include: {
      checklist: true,
      clearances: true,
    },
  });
  if (!offboarding) throw ApiError.notFound('Case not found');

  // Verify all checklist items done
  const pendingItems = offboarding.checklist.filter(
    i => i.status !== ChecklistStatus.COMPLETED && i.status !== ChecklistStatus.WAIVED
  );
  if (pendingItems.length > 0) {
    throw ApiError.badRequest(`${pendingItems.length} checklist item(s) still pending`);
  }

  // 🔐 Auto-revoke all permissions and roles
  await prisma.$transaction([
    // Deactivate user account
    prisma.user_.update({
      where: { employeeId: offboarding.employeeId },
      data: { isActive: false },
    }),
    // Revoke all role assignments
    prisma.userRole_.updateMany({
      where: { user: { employeeId: offboarding.employeeId } },
      data: { isActive: false },
    }),
    // Mark offboarding as complete
    prisma.offboardingCase.update({
      where: { id: caseId },
      data: { status: OffboardStatus.COMPLETED, completedAt: new Date() },
    }),
    // Terminate employee
    prisma.employee.update({
      where: { id: offboarding.employeeId },
      data: { status: 'TERMINATED', terminationDate: offboarding.exitDate },
    }),
  ]);

  // Flush permission caches for the user
  const user = await prisma.user_.findFirst({ where: { employeeId: offboarding.employeeId } });
  if (user) {
    const keys = await redis.keys(`perm:${user.id}:*`);
    if (keys.length) await redis.del(...keys);
  }

  return { success: true, message: 'Offboarding completed. All access revoked.' };
};

export const cancelOffboarding = async (caseId: string, orgId: string, reason: string) => {
  await prisma.offboardingCase.update({
    where: { id: caseId },
    data: { status: OffboardStatus.CANCELLED, notes: reason },
  });
};
