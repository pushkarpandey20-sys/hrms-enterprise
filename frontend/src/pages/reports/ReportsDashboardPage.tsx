import { motion } from 'framer-motion';
import { FileSpreadsheet, FileText, Download, Calendar, Users, Package, AlertTriangle } from 'lucide-react';
import { attendanceApi, leaveApi } from '@/services/api';
import { api } from '@/services/api';
import { downloadBlob } from '@/lib/utils';

const reports = [
  {
    title: 'Attendance Register',
    description: 'Daily attendance for any date range and department',
    icon: Calendar,
    color: 'from-blue-600/20 to-blue-800/10 border-blue-500/20',
    iconColor: 'text-blue-400',
    action: async () => {
      const today = new Date().toISOString().split('T')[0];
      const res = await attendanceApi.exportRegister({ startDate: today, endDate: today });
      downloadBlob(res.data, `attendance-${today}.xlsx`);
    },
  },
  {
    title: 'Leave Report',
    description: 'Annual leave utilization by employee and type',
    icon: FileSpreadsheet,
    color: 'from-emerald-600/20 to-emerald-800/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    action: async () => {
      const res = await api.get('/leave/export', { params: { year: new Date().getFullYear() }, responseType: 'blob' });
      downloadBlob(res.data, `leave-report-${new Date().getFullYear()}.xlsx`);
    },
  },
  {
    title: 'Headcount Report',
    description: 'Full employee list with department and status breakdown',
    icon: Users,
    color: 'from-indigo-600/20 to-indigo-800/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
    action: async () => {
      const res = await api.get('/reports/headcount', { responseType: 'blob' });
      downloadBlob(res.data, 'headcount.xlsx');
    },
  },
  {
    title: 'Asset Register',
    description: 'Complete asset inventory with assignment status',
    icon: Package,
    color: 'from-amber-600/20 to-amber-800/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    action: async () => {
      const res = await api.get('/assets/export', { responseType: 'blob' });
      downloadBlob(res.data, 'asset-register.xlsx');
    },
  },
  {
    title: 'Document Expiry',
    description: 'Upcoming document expirations (next 30 days)',
    icon: AlertTriangle,
    color: 'from-red-600/20 to-red-800/10 border-red-500/20',
    iconColor: 'text-red-400',
    action: async () => {
      const res = await api.get('/reports/document-expiry', { responseType: 'blob' });
      downloadBlob(res.data, 'document-expiry.xlsx');
    },
  },
  {
    title: 'Birthday & Anniversary',
    description: 'Employee birthdays and work anniversaries this month',
    icon: Calendar,
    color: 'from-pink-600/20 to-pink-800/10 border-pink-500/20',
    iconColor: 'text-pink-400',
    action: async () => {
      const res = await api.get('/reports/birthday-anniversary', { params: { month: new Date().getMonth() + 1 }, responseType: 'blob' });
      downloadBlob(res.data, 'birthday-anniversary.xlsx');
    },
  },
];

export default function ReportsDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Reports</h1>
        <p className="text-muted-foreground text-sm">Download enterprise reports as Excel files</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map(({ title, description, icon: Icon, color, iconColor, action }, i) => (
          <motion.div key={title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={`glass-card p-5 bg-gradient-to-br ${color} cursor-pointer group hover:scale-[1.01] transition-all hover:shadow-glow`}
            onClick={action}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg bg-black/20 flex items-center justify-center ${iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
              <Download className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
