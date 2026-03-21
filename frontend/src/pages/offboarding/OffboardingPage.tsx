import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { offboardingApi } from '../../services/api';
import {
  LogOut, Plus, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  FileText, DollarSign, Users, Shield, Star, XCircle,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  INITIATED:   { label: 'Initiated',    color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  IN_PROGRESS: { label: 'In Progress',  color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  CLEARANCE_PENDING: { label: 'Clearances Pending', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  INTERVIEW_PENDING: { label: 'Interview Pending', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' },
  FNF_PENDING: { label: 'FnF Pending',  color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20' },
  COMPLETED:   { label: 'Completed',    color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  CANCELLED:   { label: 'Cancelled',    color: 'text-red-400 bg-red-400/10 border-red-400/20' },
};

export default function OffboardingPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCase, setSelectedCase] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['offboarding-cases'],
    queryFn: () => offboardingApi.list().then(r => r.data),
  });

  const { data: caseDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['offboarding-case', selectedCase?.id],
    queryFn: () => selectedCase ? offboardingApi.getCase(selectedCase.id).then(r => r.data.data) : null,
    enabled: !!selectedCase,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Offboarding</h1>
          <p className="text-white/50 text-sm mt-1">Manage employee exits with full audit trail</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Initiate Exit
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cases list */}
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="glass-card rounded-xl h-24 animate-pulse" />)
          ) : data?.cases?.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <LogOut className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No active offboarding cases</p>
            </div>
          ) : (
            data?.cases?.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedCase(c)}
                className={`w-full glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-colors ${
                  selectedCase?.id === c.id ? 'ring-1 ring-electric' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 font-medium text-sm">
                      {c.employee?.firstName} {c.employee?.lastName}
                    </p>
                    <p className="text-white/40 text-xs">
                      {c.employee?.department?.name} · {c.exitType.replace('_', ' ')}
                    </p>
                    <p className="text-white/30 text-xs mt-1">
                      Exit: {new Date(c.exitDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[c.status]?.color}`}>
                      {STATUS_CONFIG[c.status]?.label}
                    </span>
                    <div className="text-[10px] text-white/30">
                      {c._count?.checklist ?? 0} tasks
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Case detail */}
        <AnimatePresence>
          {selectedCase && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card rounded-xl p-5 max-h-[70vh] overflow-y-auto"
            >
              {detailLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-white/[0.04] rounded animate-pulse" />)}
                </div>
              ) : caseDetail ? (
                <CaseDetail caseData={caseDetail} />
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreate && <InitiateModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── Case Detail ──────────────────────────────────────────────────────────────

function CaseDetail({ caseData }: { caseData: any }) {
  const qc = useQueryClient();
  const [activeSection, setActiveSection] = useState<string>('checklist');

  const checklistMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: string; status: string }) =>
      offboardingApi.updateChecklistItem(itemId, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-case', caseData.id] }),
  });

  const clearanceMutation = useMutation({
    mutationFn: (data: object) => offboardingApi.signOffClearance(caseData.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['offboarding-case', caseData.id] }),
  });

  const completeMutation = useMutation({
    mutationFn: () => offboardingApi.complete(caseData.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offboarding-cases'] });
      qc.invalidateQueries({ queryKey: ['offboarding-case', caseData.id] });
    },
  });

  const { data: fnfData, refetch: fetchFnF } = useQuery({
    queryKey: ['fnf', caseData.id],
    queryFn: () => offboardingApi.getFnF(caseData.id).then(r => r.data.data),
    enabled: false,
  });

  const completedItems = caseData.checklist?.filter((i: any) =>
    i.status === 'COMPLETED' || i.status === 'WAIVED'
  ).length ?? 0;
  const totalItems = caseData.checklist?.length ?? 0;

  const CHECKLIST_STATUS_COLORS: Record<string, string> = {
    PENDING:    'text-white/40',
    IN_PROGRESS:'text-blue-400',
    COMPLETED:  'text-green-400',
    WAIVED:     'text-white/30',
    BLOCKED:    'text-red-400',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white/90 font-semibold">
            {caseData.employee?.firstName} {caseData.employee?.lastName}
          </h3>
          <p className="text-white/40 text-xs">
            {caseData.employee?.department?.name} · {caseData.exitType}
          </p>
        </div>
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[caseData.status]?.color}`}>
          {STATUS_CONFIG[caseData.status]?.label}
        </span>
      </div>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-white/50">
          <span>Checklist progress</span>
          <span>{completedItems}/{totalItems}</span>
        </div>
        <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-electric to-green-400 rounded-full transition-all"
            style={{ width: totalItems > 0 ? `${(completedItems / totalItems) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 text-xs">
        {['checklist', 'clearances', 'fnf', 'interview'].map(s => (
          <button
            key={s}
            onClick={() => setActiveSection(s)}
            className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
              activeSection === s ? 'bg-electric/20 text-electric border border-electric/30' : 'text-white/40 hover:text-white/60'
            }`}
          >
            {s === 'fnf' ? 'F&F' : s}
          </button>
        ))}
      </div>

      {/* Checklist */}
      {activeSection === 'checklist' && (
        <div className="space-y-2">
          {caseData.checklist?.map((item: any) => (
            <div key={item.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/[0.02]">
              <button
                onClick={() => checklistMutation.mutate({
                  itemId: item.id,
                  status: item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED',
                })}
                className={`mt-0.5 shrink-0 transition-colors ${
                  item.status === 'COMPLETED' ? 'text-green-400' : 'text-white/20 hover:text-white/50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.status === 'COMPLETED' ? 'line-through text-white/30' : 'text-white/80'}`}>
                  {item.task}
                </p>
                <p className="text-[10px] text-white/30">{item.assignedDept}</p>
              </div>
              <span className={`text-[10px] shrink-0 ${CHECKLIST_STATUS_COLORS[item.status]}`}>
                {item.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Clearances */}
      {activeSection === 'clearances' && (
        <div className="space-y-3">
          {['IT', 'Finance', 'Administration', 'HR', 'Manager', 'Legal'].map(dept => {
            const clearance = caseData.clearances?.find((c: any) => c.department === dept);
            return (
              <div key={dept} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                <span className="text-white/70 text-sm">{dept}</span>
                {clearance ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] ${clearance.status === 'CLEARED' ? 'text-green-400' : 'text-red-400'}`}>
                      {clearance.status}
                    </span>
                    <span className="text-[10px] text-white/30">{clearance.signedOffBy?.displayName}</span>
                  </div>
                ) : (
                  <button
                    onClick={() => clearanceMutation.mutate({ department: dept, status: 'CLEARED' })}
                    className="text-xs px-2 py-1 rounded-lg bg-electric/10 text-electric border border-electric/20 hover:bg-electric/20 transition-colors"
                  >
                    Sign Off
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* FnF */}
      {activeSection === 'fnf' && (
        <div className="space-y-3">
          {!fnfData ? (
            <button
              onClick={() => fetchFnF()}
              className="w-full btn-primary flex items-center justify-center gap-2 text-sm"
            >
              <DollarSign className="w-4 h-4" />
              Calculate Full & Final Settlement
            </button>
          ) : (
            <div className="space-y-2">
              {[
                { label: 'Monthly Salary', value: fnfData.monthlySalary },
                { label: 'Days Worked', value: `${fnfData.daysWorked} days` },
                { label: 'Salary for Days Worked', value: fnfData.salaryForDaysWorked },
                { label: 'Leave Encashment', value: fnfData.leaveEncashment },
                { label: 'Gratuity', value: fnfData.gratuity },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-white/50">{label}</span>
                  <span className="text-white/90">
                    {typeof value === 'number' ? `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : value}
                  </span>
                </div>
              ))}
              <div className="border-t border-white/[0.06] pt-2 flex justify-between font-semibold">
                <span className="text-white/70">Total Payable</span>
                <span className="text-gold text-lg">
                  ₹{fnfData.totalPayable.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exit Interview */}
      {activeSection === 'interview' && (
        <div className="space-y-3">
          {caseData.exitInterview ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm font-medium">Exit Interview Completed</p>
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < caseData.exitInterview.npsScore
                          ? i < 6 ? 'bg-red-400' : i < 8 ? 'bg-yellow-400' : 'bg-green-400'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                  <span className="text-xs text-white/50 ml-1">NPS {caseData.exitInterview.npsScore}</span>
                </div>
              </div>
              {caseData.exitInterview.reasonForLeaving && (
                <div className="bg-white/[0.03] rounded-lg p-3 text-sm text-white/70">
                  <p className="text-white/40 text-xs mb-1">Reason for Leaving</p>
                  {caseData.exitInterview.reasonForLeaving}
                </div>
              )}
            </div>
          ) : (
            <p className="text-white/40 text-sm text-center py-4">Exit interview not yet conducted</p>
          )}
        </div>
      )}

      {/* Complete offboarding button */}
      {caseData.status !== 'COMPLETED' && caseData.status !== 'CANCELLED' && (
        <div className="pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => {
              if (confirm('Complete offboarding? This will revoke all access permanently.')) {
                completeMutation.mutate();
              }
            }}
            disabled={completeMutation.isPending || completedItems < totalItems}
            className="w-full px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors disabled:opacity-40"
          >
            {completeMutation.isPending
              ? 'Completing...'
              : completedItems < totalItems
              ? `${totalItems - completedItems} tasks pending`
              : '✓ Complete Offboarding & Revoke Access'
            }
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Initiate Modal ───────────────────────────────────────────────────────────

function InitiateModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    employeeId: '',
    exitType: 'RESIGNATION',
    exitDate: '',
    reason: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data: object) => offboardingApi.initiate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['offboarding-cases'] });
      onClose();
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        className="glass-card rounded-2xl p-6 w-full max-w-md space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-white">Initiate Offboarding</h2>

        <input
          value={form.employeeId}
          onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
          placeholder="Employee ID"
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
        />

        <select
          value={form.exitType}
          onChange={e => setForm(f => ({ ...f, exitType: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
        >
          {['RESIGNATION', 'TERMINATION', 'RETIREMENT', 'CONTRACT_END'].map(t => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>

        <input
          type="date"
          value={form.exitDate}
          onChange={e => setForm(f => ({ ...f, exitDate: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
        />

        <select
          value={form.reason}
          onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
        >
          <option value="">Select Reason (optional)</option>
          {['BETTER_OPPORTUNITY', 'PERSONAL_REASONS', 'RELOCATION', 'EDUCATION', 'HEALTH', 'RETIREMENT_AGE', 'CONTRACT_EXPIRY', 'PERFORMANCE', 'MISCONDUCT', 'RESTRUCTURING', 'OTHER'].map(r => (
            <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
          ))}
        </select>

        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Additional notes..."
          rows={2}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm resize-none"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate({
              ...form,
              exitDate: new Date(form.exitDate).toISOString(),
              reason: form.reason || undefined,
            })}
            disabled={!form.employeeId || !form.exitDate || mutation.isPending}
            className="flex-1 btn-primary disabled:opacity-50 text-sm"
          >
            {mutation.isPending ? 'Initiating...' : 'Initiate Exit'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
