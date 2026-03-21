import { prisma } from '../../../config/database';

export class DashboardService {
  async getHRDashboard(orgId: string) {
    const now = new Date();
    const thisMonth = { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: now };
    const lastMonth = { gte: new Date(now.getFullYear(), now.getMonth() - 1, 1), lte: new Date(now.getFullYear(), now.getMonth(), 0) };
    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [
      totalEmployees, activeEmployees, newJoiners, relievedThisMonth,
      presentToday, onLeaveToday,
      headcountByDept, attritionData, payrollByMonth, leaveSummary, assetSummary,
    ] = await Promise.all([
      prisma.employee.count({ where: { organizationId: orgId } }),
      prisma.employee.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      prisma.employee.count({ where: { organizationId: orgId, joiningDate: thisMonth } }),
      prisma.employee.count({ where: { organizationId: orgId, relievingDate: thisMonth } }),
      prisma.attendance.count({ where: { employee: { organizationId: orgId }, date: today, clockIn: { not: null } } }),
      prisma.attendance.count({ where: { employee: { organizationId: orgId }, date: today, status: 'ON_LEAVE' } }),
      prisma.department.findMany({
        where: { organizationId: orgId },
        select: { name: true, _count: { select: { employees: { where: { status: 'ACTIVE' } } } } },
      }),
      // Last 12 months attrition
      Promise.all(Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        return prisma.employee.count({
          where: { organizationId: orgId, relievingDate: { gte: d, lte: end } },
        }).then(count => ({ month: d.toLocaleString('default', { month: 'short', year: '2-digit' }), count }));
      })),
      // Last 6 months payroll
      prisma.payrollRun.findMany({
        where: { organizationId: orgId, status: 'PAID' },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 6,
        select: { month: true, year: true, totalNetPay: true, totalGross: true },
      }),
      prisma.leaveRequest.groupBy({
        by: ['leaveTypeId'],
        where: { employee: { organizationId: orgId }, status: 'APPROVED', startDate: { gte: new Date(now.getFullYear(), 0, 1) } },
        _sum: { totalDays: true },
      }),
      prisma.asset.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: true,
      }),
    ]);

    return {
      kpis: { totalEmployees, activeEmployees, newJoiners, relievedThisMonth, presentToday, onLeaveToday, attendanceRate: activeEmployees ? Math.round((presentToday / activeEmployees) * 100) : 0 },
      headcountByDept: headcountByDept.map(d => ({ name: d.name, count: d._count.employees })),
      attritionData: attritionData.reverse(),
      payrollByMonth: payrollByMonth.reverse().map(p => ({
        month: new Date(p.year, p.month - 1).toLocaleString('default', { month: 'short', year: '2-digit' }),
        gross: p.totalGross, net: p.totalNetPay,
      })),
      leaveSummary,
      assetSummary: assetSummary.map(a => ({ status: a.status, count: a._count })),
    };
  }
}

export const dashboardService = new DashboardService();
