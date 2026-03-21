import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FileText, Download } from 'lucide-react';
import { payrollApi } from '@/services/api';
import { formatCurrency, downloadBlob } from '@/lib/utils';

export default function MyPayslipsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll', 'my-payslips'],
    queryFn: () => payrollApi.getMyPayslips().then(r => r.data.data),
  });

  const handleDownload = async (payslipId: string, month: number, year: number) => {
    const res = await payrollApi.downloadPayslip(payslipId);
    downloadBlob(res.data, `payslip-${year}-${month}.pdf`);
  };

  return (
    <div className="space-y-5">
      <h1 className="page-title">My Payslips</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data?.map((p: any, i: number) => (
          <motion.div key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="glass-card p-5 hover:border-electric/30 transition-all hover:shadow-glow group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-semibold text-foreground">{new Date(p.year, p.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{p.presentDays} working days</p>
              </div>
              <FileText className="w-5 h-5 text-muted-foreground group-hover:text-electric transition-colors" />
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gross</span>
                <span className="text-foreground font-medium">{formatCurrency(p.grossEarnings)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deductions</span>
                <span className="text-red-400">{formatCurrency(p.totalDeductions)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                <span>Net Pay</span>
                <span className="text-emerald-400">{formatCurrency(p.netPay)}</span>
              </div>
            </div>
            <button onClick={() => handleDownload(p.id, p.month, p.year)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-electric/10 text-electric hover:bg-electric/20 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </motion.div>
        ))}
        {!isLoading && !data?.length && (
          <div className="col-span-3 text-center py-12 text-muted-foreground glass-card">No payslips available yet.</div>
        )}
      </div>
    </div>
  );
}
