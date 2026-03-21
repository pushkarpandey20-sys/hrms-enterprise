import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { performanceApi } from '../../services/api';
import {
  Target, TrendingUp, Star, Users, Plus, ChevronRight,
  Award, AlertCircle, CheckCircle2, Clock, BarChart3,
} from 'lucide-react';

type PerfTab = 'goals' | 'reviews' | 'feedback' | 'pip';

export default function PerformancePage() {
  const [tab, setTab] = useState<PerfTab>('goals');

  const { data: cycles } = useQuery({
    queryKey: ['perf-cycles'],
    queryFn: () => performanceApi.listCycles().then(r => r.data.data),
  });

  const activeCycle = cycles?.find((c: any) => c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Performance Management</h1>
          <p className="text-white/50 text-sm mt-1">
            {activeCycle ? `Active: ${activeCycle.title}` : 'No active review cycle'}
          </p>
        </div>
        <Target className="w-8 h-8 text-electric/70" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1 rounded-xl w-fit">
        {(['goals', 'reviews', 'feedback', 'pip'] as PerfTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t
                ? 'bg-electric text-white shadow-glow'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'pip' ? 'PIP' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'goals' && <GoalsPanel cycles={cycles} activeCycle={activeCycle} />}
          {tab === 'reviews' && <ReviewsPanel cycles={cycles} activeCycle={activeCycle} />}
          {tab === 'feedback' && <FeedbackPanel activeCycle={activeCycle} />}
          {tab === 'pip' && <PIPPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Goals Panel ──────────────────────────────────────────────────────────────

function GoalsPanel({ cycles, activeCycle }: { cycles: any[]; activeCycle: any }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string>('');

  const { data: goals, isLoading } = useQuery({
    queryKey: ['my-goals', selectedCycleId],
    queryFn: () => performanceApi.getMyGoals(selectedCycleId || undefined).then(r => r.data.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, currentValue }: { id: string; currentValue: number }) =>
      performanceApi.updateGoalProgress(id, currentValue),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-goals'] }),
  });

  const GOAL_STATUS_COLORS: Record<string, string> = {
    NOT_STARTED: 'text-white/40',
    IN_PROGRESS: 'text-blue-400',
    COMPLETED:   'text-green-400',
    MISSED:      'text-red-400',
    CANCELLED:   'text-white/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          value={selectedCycleId}
          onChange={e => setSelectedCycleId(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
        >
          <option value="">All Cycles</option>
          {cycles?.map((c: any) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card rounded-xl h-20 animate-pulse" />
          ))}
        </div>
      ) : goals?.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center">
          <Target className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No goals yet for this cycle</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals?.map((goal: any) => (
            <motion.div key={goal.id} layout className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${GOAL_STATUS_COLORS[goal.status]}`}>
                      {goal.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-white/30 uppercase">{goal.type}</span>
                    <span className="text-[10px] text-white/30 uppercase">{goal.category}</span>
                  </div>
                  <h3 className="text-white/90 font-medium text-sm mt-1">{goal.title}</h3>
                  {goal.kpiMetric && (
                    <p className="text-white/40 text-xs">KPI: {goal.kpiMetric}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-bold text-white">
                    {Math.round(goal.progress ?? 0)}%
                  </div>
                  {goal.targetValue && (
                    <div className="text-xs text-white/40">
                      {goal.currentValue} / {goal.targetValue}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goal.progress ?? 0}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-electric to-blue-400 rounded-full"
                />
              </div>

              {goal.dueDate && (
                <p className="text-[10px] text-white/30">
                  Due {new Date(goal.dueDate).toLocaleDateString()}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Create goal modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateGoalModal
            cycles={cycles}
            activeCycle={activeCycle}
            onClose={() => setShowCreate(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Reviews Panel ────────────────────────────────────────────────────────────

function ReviewsPanel({ cycles, activeCycle }: { cycles: any[]; activeCycle: any }) {
  const [selectedCycleId, setSelectedCycleId] = useState<string>(activeCycle?.id ?? '');

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['cycle-reviews', selectedCycleId],
    queryFn: () => selectedCycleId
      ? performanceApi.getCycleReviews(selectedCycleId).then(r => r.data.data)
      : null,
    enabled: !!selectedCycleId,
  });

  const STATUS_COLORS: Record<string, string> = {
    PENDING:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    IN_PROGRESS:'text-blue-400 bg-blue-400/10 border-blue-400/20',
    SUBMITTED:  'text-green-400 bg-green-400/10 border-green-400/20',
    ACKNOWLEDGED:'text-teal-400 bg-teal-400/10 border-teal-400/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <select
          value={selectedCycleId}
          onChange={e => setSelectedCycleId(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
        >
          <option value="">Select Cycle</option>
          {cycles?.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>

      {!selectedCycleId ? (
        <div className="glass-card rounded-xl p-8 text-center text-white/40">Select a cycle to view reviews</div>
      ) : isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="glass-card rounded-xl h-16 animate-pulse" />)}</div>
      ) : reviews?.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center text-white/40">No reviews in this cycle</div>
      ) : (
        <div className="space-y-3">
          {reviews?.map((r: any) => (
            <div key={r.id} className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/90 text-sm font-medium">
                    {r.reviewee?.firstName} {r.reviewee?.lastName}
                  </p>
                  <p className="text-white/40 text-xs">
                    {r.reviewType} · by {r.reviewer?.firstName} {r.reviewer?.lastName}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {r.overallRating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-gold fill-gold" />
                      <span className="text-white font-bold">{r.overallRating.toFixed(1)}</span>
                    </div>
                  )}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[r.status] ?? ''}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feedback Panel ───────────────────────────────────────────────────────────

function FeedbackPanel({ activeCycle }: { activeCycle: any }) {
  const { data: feedback, isLoading } = useQuery({
    queryKey: ['my-feedback', activeCycle?.id],
    queryFn: () => performanceApi.getMyFeedback(activeCycle?.id).then(r => r.data.data),
    enabled: !!activeCycle,
  });

  const RELATION_ICON: Record<string, string> = {
    SELF: '🪞', MANAGER: '👔', PEER: '👥', DIRECT_REPORT: '📊', SKIP_LEVEL: '🔼',
  };

  if (!activeCycle) {
    return (
      <div className="glass-card rounded-xl p-8 text-center text-white/40">
        No active review cycle
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {['MANAGER', 'PEER', 'DIRECT_REPORT', 'SKIP_LEVEL'].map(rel => {
          const fb = feedback?.filter((f: any) => f.relation === rel) ?? [];
          const avg = fb.length > 0
            ? (fb.reduce((sum: number, f: any) => sum + (f.overallRating ?? 0), 0) / fb.length).toFixed(1)
            : '—';
          return (
            <div key={rel} className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{RELATION_ICON[rel]}</div>
              <div className="text-xl font-bold text-white">{avg}</div>
              <div className="text-[10px] text-white/40 capitalize">{rel.replace('_', ' ')}</div>
              <div className="text-[10px] text-white/30">{fb.length} responses</div>
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="glass-card rounded-xl h-32 animate-pulse" />
      ) : (
        <div className="space-y-3">
          {feedback?.map((f: any) => (
            <div key={f.id} className="glass-card rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{RELATION_ICON[f.relation]}</span>
                  <span className="text-white/70 text-sm capitalize">{f.relation.replace('_', ' ')}</span>
                  {f.isAnonymous && <span className="text-[10px] text-white/30">(anonymous)</span>}
                </div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${i < (f.overallRating ?? 0) ? 'text-gold fill-gold' : 'text-white/20'}`}
                    />
                  ))}
                </div>
              </div>
              {f.strengthsText && (
                <p className="text-white/60 text-xs border-l-2 border-green-400/30 pl-2">
                  💪 {f.strengthsText}
                </p>
              )}
              {f.improvementsText && (
                <p className="text-white/60 text-xs border-l-2 border-orange-400/30 pl-2">
                  📈 {f.improvementsText}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PIP Panel ────────────────────────────────────────────────────────────────

function PIPPanel() {
  const PIP_STATUS_COLORS: Record<string, string> = {
    DRAFT:      'text-white/40 bg-white/5 border-white/10',
    ACTIVE:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
    COMPLETED:  'text-green-400 bg-green-400/10 border-green-400/20',
    EXTENDED:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    TERMINATED: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  return (
    <div className="glass-card rounded-xl p-8 text-center space-y-3">
      <AlertCircle className="w-8 h-8 text-white/20 mx-auto" />
      <p className="text-white/40">PIP management is available for managers</p>
      <p className="text-white/30 text-sm">
        Create and track Performance Improvement Plans with check-in schedules
      </p>
    </div>
  );
}

// ─── Create Goal Modal ────────────────────────────────────────────────────────

function CreateGoalModal({
  cycles, activeCycle, onClose,
}: {
  cycles: any[]; activeCycle: any; onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    cycleId: activeCycle?.id ?? '',
    employeeId: '', // will be filled from auth store in real app
    title: '',
    type: 'SMART',
    category: 'INDIVIDUAL',
    targetValue: '',
    kpiMetric: '',
    dueDate: '',
  });

  const mutation = useMutation({
    mutationFn: (data: object) => performanceApi.createGoal(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-goals'] });
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
        <h2 className="text-lg font-semibold text-white">Create Goal</h2>

        <select
          value={form.cycleId}
          onChange={e => setForm(f => ({ ...f, cycleId: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
        >
          <option value="">Select Cycle</option>
          {cycles?.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>

        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Goal title"
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
          >
            {['OKR', 'SMART', 'KPI'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
          >
            {['INDIVIDUAL', 'TEAM', 'DEPARTMENT', 'ORGANIZATION'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            value={form.targetValue}
            onChange={e => setForm(f => ({ ...f, targetValue: e.target.value }))}
            placeholder="Target value"
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
          />
          <input
            value={form.kpiMetric}
            onChange={e => setForm(f => ({ ...f, kpiMetric: e.target.value }))}
            placeholder="KPI metric"
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none text-sm"
          />
        </div>

        <input
          type="datetime-local"
          value={form.dueDate}
          onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white focus:outline-none text-sm"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 text-sm">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({
              ...form,
              targetValue: form.targetValue ? +form.targetValue : undefined,
              dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
            })}
            disabled={!form.title || !form.cycleId || mutation.isPending}
            className="flex-1 btn-primary disabled:opacity-50 text-sm"
          >
            {mutation.isPending ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
