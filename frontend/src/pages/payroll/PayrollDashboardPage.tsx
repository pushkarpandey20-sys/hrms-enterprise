import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Play, CheckCircle, DollarSign, Users, Download, Mail } from 'lucide-react';
import { payrollApi } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, downloadBlob } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/skeleton';

export default function PayrollDashboardPage() {
  const qc = useQueryClient();
  const { data: runs, isLoading } = useQuery({
    queryKey: ['payroll', 'runs'],
    queryFn: () => payrollApi.getRuns().then(r => r.data.data),
  });

  const runMutation = useMutation({
    mutationFn: () => {
      const now = new Date();
      return payrollApi.run({ month: now.getMonth() + 1, year: now.getFullYear() });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (runId: string) => payrollApi.approve(runId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll'] }),
  });

  const emailMutation = useMutation({
    mutationFn: (runId: string) => payrollApi.emailPayslips(runId),
  });

  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="text-muted-foreground text-sm">{monthName}</p>
        </div>
        <Button onClick={() => runMutation.mutate()} loading={runMutation.isPending}>
          <Play className="w-4 h-4" /> Run Payroll
        </Button>
      </div>

      {/* Payroll runs table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? <div className="p-4"><TableSkeleton rows={4} cols={7} /></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['Period', 'Employees', 'Gross', 'Deductions', 'Net Pay', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {runs?.map((run: any, i: number) => (
                <motion.tr key={run.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-border/50 table-row-hover">
                  <td className="px-4 py-3 font-semibold">
                    {new Date(run.year, run.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{run.totalEmployees}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(run.totalGross)}</td>
                  <td className="px-4 py-3 text-red-400">{formatCurrency(run.totalDeductions)}</td>
                  <td className="px-4 py-3 font-semibold text-emerald-400">{formatCurrency(run.totalNetPay)}</td>
                  <td className="px-4 py-3"><Badge variant={run.status}>{run.status}</Badge></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {run.status === 'PROCESSED' && (
                        <button onClick={() => approveMutation.mutate(run.id)}
                          className="p-1.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Approve">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {(run.status === 'PROCESSED' || run.status === 'APPROVED' || run.status === 'PAID') && (
                        <button onClick={() => emailMutation.mutate(run.id)}
                          className="p-1.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors" title="Email Payslips">
                          <Mail className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!runs?.length && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No payroll runs yet. Click "Run Payroll" to process the current month.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
