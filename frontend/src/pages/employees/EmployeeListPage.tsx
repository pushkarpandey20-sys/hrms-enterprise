import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, Search, Download, Upload, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { employeeApi } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { getInitials, downloadBlob } from '@/lib/utils';

export default function EmployeeListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search, status],
    queryFn: () => employeeApi.list({ page, limit: 20, search, status }).then(r => r.data),
    placeholderData: (prev) => prev,
  });

  const handleExport = async () => {
    const res = await employeeApi.exportExcel();
    downloadBlob(res.data, 'employees.xlsx');
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="text-muted-foreground text-sm">{data?.pagination?.total || 0} total employees</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4" /> Import
          </Button>
          <Link to="/employees/new">
            <Button size="sm">
              <UserPlus className="w-4 h-4" /> Add Employee
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-2 flex-1 min-w-48 max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 flex-1 outline-none"
            placeholder="Search by name, email, code..." />
        </div>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-electric/50">
          <option value="">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="PROBATION">Probation</option>
          <option value="ON_LEAVE">On Leave</option>
          <option value="RESIGNED">Resigned</option>
          <option value="TERMINATED">Terminated</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? <div className="p-4"><TableSkeleton rows={6} cols={6} /></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['Employee', 'Code', 'Department', 'Designation', 'Joining Date', 'Status'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data?.data?.map((emp: any, i: number) => (
                <motion.tr key={emp.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 table-row-hover group">
                  <td className="px-4 py-3">
                    <Link to={`/employees/${emp.id}`} className="flex items-center gap-3">
                      {emp.photoUrl ? (
                        <img src={emp.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border group-hover:ring-electric/50 transition-all" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                          {getInitials(`${emp.firstName} ${emp.lastName}`)}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground group-hover:text-electric transition-colors">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground">{emp.workEmail}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{emp.employeeCode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.department?.name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{emp.designation?.name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(emp.joiningDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3"><Badge variant={emp.status}>{emp.status}</Badge></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {data?.pagination && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, data.pagination.total)} of {data.pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={!data.pagination.hasPrev}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground px-2">Page {page} of {data.pagination.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={!data.pagination.hasNext}
                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-secondary disabled:opacity-40 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
