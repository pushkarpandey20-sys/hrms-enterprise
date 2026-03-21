import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Clock, Plus, Filter } from 'lucide-react';
import { leaveApi } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';

export default function LeaveManagementPage() {
  const [tab, setTab] = useState<'pending' | 'all'>('pending');
  const qc = useQueryClient();

  const { data: pending, isLoading } = useQuery({
    queryKey: ['leave', 'pending'],
    queryFn: () => leaveApi.getPending().then(r => r.data.data),
  });

  const processMutation = useMutation({
    mutationFn: ({ id, action, note }: { id: string; action: string; note?: string }) =>
      leaveApi.process(id, action, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave'] }),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="text-muted-foreground text-sm">{pending?.length || 0} pending approvals</p>
        </div>
        <Button size="sm"><Plus className="w-4 h-4" /> Add Leave Type</Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 w-fit">
        {(['pending', 'all'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${tab === t ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t === 'pending' ? `Pending (${pending?.length || 0})` : 'All Requests'}
          </button>
        ))}
      </div>

      {/* Leave requests */}
      <div className="glass-card overflow-hidden">
        {isLoading ? <div className="p-4"><TableSkeleton rows={5} cols={6} /></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['Employee', 'Leave Type', 'Dates', 'Days', 'Reason', 'Status', 'Action'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pending?.map((leave: any, i: number) => (
                <motion.tr key={leave.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-border/50 table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                        {getInitials(`${leave.employee.firstName} ${leave.employee.lastName}`)}
                      </div>
                      <div>
                        <p className="font-medium">{leave.employee.firstName} {leave.employee.lastName}</p>
                        <p className="text-xs text-muted-foreground">{leave.employee.department?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ background: `${leave.leaveType.color}20`, color: leave.leaveType.color }}>
                      {leave.leaveType.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(leave.startDate).toLocaleDateString()} → {new Date(leave.endDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3"><span className="font-semibold text-foreground">{leave.totalDays}</span></td>
                  <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{leave.reason}</td>
                  <td className="px-4 py-3"><Badge variant={leave.status}>{leave.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => processMutation.mutate({ id: leave.id, action: 'APPROVE' })}
                        className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button onClick={() => processMutation.mutate({ id: leave.id, action: 'REJECT' })}
                        className="p-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {pending?.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-emerald-500/50" />
                  All caught up! No pending leave requests.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
