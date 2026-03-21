import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Mail, Phone, MapPin, Calendar, Briefcase, CreditCard, FileText, Package } from 'lucide-react';
import { employeeApi, leaveApi } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { getInitials, formatCurrency, formatDate } from '@/lib/utils';

const TAB_LABELS = ['Overview', 'Documents', 'Attendance', 'Leave', 'Assets', 'Payroll'];

export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState(0);

  const { data: emp, isLoading } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => employeeApi.getById(id!).then(r => r.data.data),
  });

  const { data: balances } = useQuery({
    queryKey: ['leave-balances', id],
    queryFn: () => leaveApi.getBalances(id).then(r => r.data.data),
    enabled: tab === 3,
  });

  if (isLoading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 bg-white/5 rounded w-48" />
      <div className="h-64 glass-card" />
    </div>
  );
  if (!emp) return <div className="glass-card p-8 text-center text-muted-foreground">Employee not found</div>;

  return (
    <div className="space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link to="/employees" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </Link>
        <Link to={`/employees/${id}/edit`}>
          <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-secondary text-sm transition-colors">
            <Edit className="w-4 h-4" /> Edit
          </button>
        </Link>
      </div>

      {/* Profile header */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {emp.photoUrl ? (
            <img src={emp.photoUrl} alt="" className="w-24 h-24 rounded-2xl object-cover ring-2 ring-electric/30 shadow-glow flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 shadow-glow">
              {getInitials(`${emp.firstName} ${emp.lastName}`)}
            </div>
          )}
          <div className="flex-1">
            <div className="flex flex-wrap items-start gap-3 mb-2">
              <h1 className="font-display text-2xl font-bold text-foreground">{emp.firstName} {emp.lastName}</h1>
              <Badge variant={emp.status}>{emp.status}</Badge>
            </div>
            <p className="text-muted-foreground mb-1">{emp.designation?.name} · {emp.department?.name}</p>
            <p className="text-sm text-muted-foreground/70 font-mono">{emp.employeeCode}</p>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{emp.workEmail}</span>
              {emp.workPhone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{emp.workPhone}</span>}
              {emp.city && <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{emp.city}, {emp.state}</span>}
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {formatDate(emp.joiningDate)}</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="flex flex-wrap md:flex-col gap-3 md:gap-2 md:items-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Employment</p>
              <p className="font-medium capitalize">{emp.employmentType?.replace('_', ' ').toLowerCase()}</p>
            </div>
            {emp.manager && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Reports To</p>
                <p className="font-medium">{emp.manager.firstName} {emp.manager.lastName}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 w-fit overflow-x-auto">
        {TAB_LABELS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${tab === i ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.15 }}>
        {tab === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InfoCard title="Personal Information" icon={<Briefcase className="w-4 h-4" />} items={[
              { label: 'Date of Birth', value: emp.dateOfBirth ? formatDate(emp.dateOfBirth) : '-' },
              { label: 'Gender', value: emp.gender || '-' },
              { label: 'Blood Group', value: emp.bloodGroup?.replace('_', '') || '-' },
              { label: 'Nationality', value: emp.nationality || '-' },
              { label: 'Personal Email', value: emp.personalEmail || '-' },
              { label: 'Personal Phone', value: emp.personalPhone || '-' },
            ]} />
            <InfoCard title="Bank Details" icon={<CreditCard className="w-4 h-4" />} items={[
              { label: 'Bank Name', value: emp.bankName || '-' },
              { label: 'Account No', value: emp.bankAccountNo ? `****${emp.bankAccountNo.slice(-4)}` : '-' },
              { label: 'IFSC Code', value: emp.bankIfscCode || '-' },
              { label: 'PAN', value: emp.panNumber || '-' },
              { label: 'UAN', value: emp.uan || '-' },
              { label: 'PF Account', value: emp.pfAccountNumber || '-' },
            ]} />
            {emp.emergencyContacts?.length > 0 && (
              <InfoCard title="Emergency Contact" icon={<Phone className="w-4 h-4" />} items={
                emp.emergencyContacts.slice(0, 1).flatMap((c: any) => [
                  { label: 'Name', value: c.name },
                  { label: 'Relationship', value: c.relationship },
                  { label: 'Phone', value: c.phone },
                ])
              } />
            )}
          </div>
        )}
        {tab === 3 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {balances?.map((b: any) => (
              <div key={b.id} className="glass-card p-4 text-center hover:border-electric/30 transition-all" style={{ borderColor: `${b.leaveType.color}30` }}>
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-white" style={{ background: b.leaveType.color }}>
                  {b.remainingDays}
                </div>
                <p className="text-xs font-medium text-foreground">{b.leaveType.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{b.usedDays}/{b.totalDays} used</p>
                <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(b.usedDays/b.totalDays)*100}%`, background: b.leaveType.color }} />
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 2 && <div className="glass-card p-8 text-center text-muted-foreground">Monthly attendance calendar view - full implementation follows attendance register patterns</div>}
        {tab === 1 && (
          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-secondary/30">{['Document', 'Type', 'Expiry', 'Status'].map(h => <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
              <tbody>
                {emp.documents?.map((d: any) => (
                  <tr key={d.id} className="border-b border-border/50 table-row-hover">
                    <td className="px-4 py-3 flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />{d.name}</td>
                    <td className="px-4 py-3"><Badge variant="ACTIVE">{d.type}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{d.expiryDate ? formatDate(d.expiryDate) : 'No expiry'}</td>
                    <td className="px-4 py-3"><Badge variant={d.isVerified ? 'APPROVED' : 'PENDING'}>{d.isVerified ? 'Verified' : 'Pending'}</Badge></td>
                  </tr>
                ))}
                {!emp.documents?.length && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No documents uploaded</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {tab === 4 && (
          <div className="space-y-3">
            {emp.assetAssignments?.map((a: any) => (
              <div key={a.id} className="glass-card p-4 flex items-center gap-4">
                <Package className="w-8 h-8 text-electric flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">{a.asset.name}</p>
                  <p className="text-xs text-muted-foreground">{a.asset.assetCode} · {a.asset.serialNumber}</p>
                </div>
                <div className="text-right">
                  <Badge variant="ACTIVE">{a.asset.condition}</Badge>
                  <p className="text-xs text-muted-foreground mt-0.5">Assigned {formatDate(a.assignedAt)}</p>
                </div>
              </div>
            ))}
            {!emp.assetAssignments?.length && <div className="glass-card p-8 text-center text-muted-foreground">No assets assigned</div>}
          </div>
        )}
        {tab === 5 && (
          <div className="glass-card p-6">
            {emp.salaryStructures?.[0] ? (
              <div className="space-y-3">
                <p className="font-semibold">Current Salary Structure · CTC: {formatCurrency(emp.salaryStructures[0].ctc)}</p>
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border"><th className="text-left py-2 text-muted-foreground">Component</th><th className="text-right py-2 text-muted-foreground">Monthly</th><th className="text-right py-2 text-muted-foreground">Annual</th></tr></thead>
                  <tbody>
                    {emp.salaryStructures[0].components?.map((c: any) => (
                      <tr key={c.id} className="border-b border-border/30">
                        <td className="py-2">{c.component.name}</td>
                        <td className="py-2 text-right font-medium">{formatCurrency(c.monthlyAmount)}</td>
                        <td className="py-2 text-right text-muted-foreground">{formatCurrency(c.annualAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="text-muted-foreground">No salary structure configured</p>}
          </div>
        )}
      </motion.div>
    </div>
  );
}

function InfoCard({ title, icon, items }: { title: string; icon: React.ReactNode; items: { label: string; value: string }[] }) {
  return (
    <div className="glass-card p-5">
      <h3 className="flex items-center gap-2 font-semibold text-foreground mb-4 text-sm">
        <span className="text-electric">{icon}</span>{title}
      </h3>
      <dl className="space-y-2.5">
        {items.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-xs text-muted-foreground flex-shrink-0">{label}</dt>
            <dd className="text-xs text-foreground text-right font-medium truncate">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
