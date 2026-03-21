import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Users, Clock, TrendingUp, DollarSign, Calendar, Package, UserPlus, UserMinus } from 'lucide-react';
import { dashboardApi } from '@/services/api';
import { formatCurrency } from '@/lib/utils';
import { StatCardSkeleton, TableSkeleton } from '@/components/ui/skeleton';
import DonutChart from '@/components/charts/DonutChart';
import BarChartComponent from '@/components/charts/BarChartComponent';
import AreaChart from '@/components/charts/AreaChart';

interface KPI { value: number; label: string; icon: React.ElementType; color: string; sub?: string; }

function StatCard({ value, label, icon: Icon, color, sub }: KPI) {
  return (
    <motion.div whileHover={{ scale: 1.01 }} className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
          <p className="font-display text-3xl font-bold text-foreground">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'hr'],
    queryFn: () => dashboardApi.hr().then(r => r.data.data),
    refetchInterval: 60000,
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="page-title">HR Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Real-time overview of your workforce</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? Array.from({length: 8}).map((_,i) => <StatCardSkeleton key={i} />) : data && [
          { label: 'Total Employees', value: data.kpis.totalEmployees, icon: Users, color: 'bg-electric/10 text-electric' },
          { label: 'Active Today', value: data.kpis.presentToday, icon: Clock, color: 'bg-emerald-500/10 text-emerald-400', sub: `${data.kpis.attendanceRate}% attendance rate` },
          { label: 'On Leave', value: data.kpis.onLeaveToday, icon: Calendar, color: 'bg-yellow-500/10 text-yellow-400' },
          { label: 'New Joiners', value: data.kpis.newJoiners, icon: UserPlus, color: 'bg-indigo-500/10 text-indigo-400', sub: 'This month' },
          { label: 'Relieved', value: data.kpis.relievedThisMonth, icon: UserMinus, color: 'bg-red-500/10 text-red-400', sub: 'This month' },
          { label: 'Active Employees', value: data.kpis.activeEmployees, icon: TrendingUp, color: 'bg-teal-500/10 text-teal-400' },
        ].map((kpi) => <StatCard key={kpi.label} {...kpi as KPI} />)}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {isLoading ? <div className="lg:col-span-2"><TableSkeleton rows={4} cols={3} /></div> :
          data?.payrollByMonth && (
            <div className="lg:col-span-2">
              <BarChartComponent
                data={data.payrollByMonth}
                dataKeys={[{ key: 'gross', color: '#3B82F6' }, { key: 'net', color: '#10B981' }]}
                title="Payroll Cost (Last 6 Months)"
                formatter={(v) => `₹${(v/100000).toFixed(1)}L`}
              />
            </div>
          )}
        {isLoading ? <StatCardSkeleton /> :
          data?.headcountByDept && (
            <DonutChart
              data={data.headcountByDept.map((d: any) => ({ name: d.name, value: d.count }))}
              title="Headcount by Department"
            />
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? <StatCardSkeleton /> :
          data?.attritionData && (
            <AreaChart
              data={data.attritionData}
              dataKey="count"
              title="Monthly Attrition Trend"
              color="#EF4444"
            />
          )}
        {isLoading ? <StatCardSkeleton /> :
          data?.assetSummary && (
            <DonutChart
              data={data.assetSummary.map((a: any) => ({ name: a.status, value: a.count }))}
              title="Asset Status Distribution"
            />
          )}
      </div>
    </div>
  );
}
