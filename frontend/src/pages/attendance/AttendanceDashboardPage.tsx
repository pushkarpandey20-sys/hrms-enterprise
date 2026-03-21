import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Clock, UserCheck, UserX, AlertTriangle, Download } from 'lucide-react';
import { attendanceApi } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getInitials, downloadBlob } from '@/lib/utils';
import { StatCardSkeleton } from '@/components/ui/skeleton';

export default function AttendanceDashboardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance', 'dashboard'],
    queryFn: () => attendanceApi.getDashboard().then(r => r.data.data),
    refetchInterval: 30000,
  });

  const handleExport = async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await attendanceApi.exportRegister({ startDate: today, endDate: today });
    downloadBlob(res.data, `attendance-${today}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-muted-foreground text-sm">Real-time workforce presence</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}><Clock className="w-4 h-4" /> Refresh</Button>
          <Button variant="outline" size="sm" onClick={handleExport}><Download className="w-4 h-4" /> Export</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {isLoading ? Array.from({length:4}).map((_,i) => <StatCardSkeleton key={i} />) : data && [
          { label: 'Total Active', value: data.totalActive, icon: UserCheck, color: 'bg-blue-500/10 text-blue-400' },
          { label: 'Present Today', value: data.presentToday, icon: UserCheck, color: 'bg-emerald-500/10 text-emerald-400' },
          { label: 'Absent', value: data.absentToday, icon: UserX, color: 'bg-red-500/10 text-red-400' },
          { label: 'Exceptions', value: data.exceptions?.length || 0, icon: AlertTriangle, color: 'bg-yellow-500/10 text-yellow-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                <p className="font-display text-3xl font-bold">{value}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Currently In */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Currently In Office ({data?.currentlyIn?.length || 0})
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data?.currentlyIn?.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {getInitials(`${a.employee.firstName} ${a.employee.lastName}`)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{a.employee.firstName} {a.employee.lastName}</p>
                  <p className="text-xs text-muted-foreground">{a.employee.department?.name} • In: {new Date(a.clockIn).toLocaleTimeString()}</p>
                </div>
                <Badge variant="PRESENT">In</Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Exceptions */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            Attendance Exceptions
          </h3>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {data?.exceptions?.length === 0 && <p className="text-muted-foreground text-sm">No exceptions today</p>}
            {data?.exceptions?.map((a: any) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-xs font-bold text-yellow-400 flex-shrink-0">
                  {getInitials(`${a.employee.firstName} ${a.employee.lastName}`)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.employee.firstName} {a.employee.lastName}</p>
                  <p className="text-xs text-yellow-400/70">{!a.isGeofenceValid ? '📍 Outside geofence' : !a.isFaceVerified ? '👤 Face unverified' : 'Exception'}</p>
                </div>
                <div className="flex gap-1">
                  <button className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30">Approve</button>
                  <button className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
