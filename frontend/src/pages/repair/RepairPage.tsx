import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { repairApi } from '../../services/api';
import {
  Wrench, Plus, Clock, AlertTriangle, CheckCircle2, ChevronRight,
  BarChart3, MessageSquare, Camera, Star,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  SUBMITTED:       { label: 'Submitted',       color: 'bg-blue-500/20 text-blue-400 border-blue-400/20' },
  UNDER_REVIEW:    { label: 'Under Review',     color: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/20' },
  APPROVED:        { label: 'Approved',         color: 'bg-green-500/20 text-green-400 border-green-400/20' },
  REJECTED:        { label: 'Rejected',         color: 'bg-red-500/20 text-red-400 border-red-400/20' },
  VENDOR_ASSIGNED: { label: 'Vendor Assigned',  color: 'bg-purple-500/20 text-purple-400 border-purple-400/20' },
  IN_REPAIR:       { label: 'In Repair',        color: 'bg-orange-500/20 text-orange-400 border-orange-400/20' },
  QC_CHECK:        { label: 'QC Check',         color: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/20' },
  REPAIRED:        { label: 'Repaired',         color: 'bg-teal-500/20 text-teal-400 border-teal-400/20' },
  RETURNED:        { label: 'Returned',         color: 'bg-indigo-500/20 text-indigo-400 border-indigo-400/20' },
  CLOSED:          { label: 'Closed',           color: 'bg-white/10 text-white/50 border-white/10' },
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-green-400',
};

type RepairTab = 'tickets' | 'analytics';

export default function RepairPage() {
  const [tab, setTab] = useState<RepairTab>('tickets');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');

  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['repair-tickets', filterStatus],
    queryFn: () => repairApi.list({ status: filterStatus || undefined }).then(r => r.data),
  });

  const { data: selectedData } = useQuery({
    queryKey: ['repair-ticket', selectedTicket?.id],
    queryFn: () => selectedTicket ? repairApi.getById(selectedTicket.id).then(r => r.data.data) : null,
    enabled: !!selectedTicket,
  });

  const advanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => repairApi.advanceStage(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repair-tickets'] });
      qc.invalidateQueries({ queryKey: ['repair-ticket', selectedTicket?.id] });
    },
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      repairApi.addComment(id, content),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['repair-ticket', selectedTicket?.id] }),
  });

  const [commentText, setCommentText] = useState('');

  return (
    <div className="h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Asset Repair</h1>
          <p className="text-white/50 text-sm mt-1">ITSM-style repair ticket management</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Ticket
        </button>
      </div>

      {/* Pipeline overview */}
      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          const count = data?.tickets?.filter((t: any) => t.status === status).length ?? 0;
          return (
            <button
              key={status}
              onClick={() => setFilterStatus(filterStatus === status ? '' : status)}
              className={`glass-card rounded-xl p-3 text-center transition-all ${
                filterStatus === status ? 'ring-1 ring-electric' : 'hover:bg-white/[0.04]'
              }`}
            >
              <div className={`text-lg font-bold ${count > 0 ? 'text-white' : 'text-white/30'}`}>{count}</div>
              <div className="text-[9px] text-white/40 mt-0.5 leading-tight">{cfg.label}</div>
            </button>
          );
        })}
      </div>

      {/* Ticket list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {isLoading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-xl h-24 animate-pulse" />
            ))
          ) : data?.tickets?.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <Wrench className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No repair tickets</p>
            </div>
          ) : (
            data?.tickets?.map((ticket: any) => {
              const cfg = STATUS_CONFIG[ticket.status];
              const isSla = ticket.slaDeadline && new Date() > new Date(ticket.slaDeadline);
              return (
                <motion.button
                  key={ticket.id}
                  layout
                  onClick={() => setSelectedTicket(ticket)}
                  className={`w-full glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-colors ${
                    selectedTicket?.id === ticket.id ? 'ring-1 ring-electric' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold ${PRIORITY_COLORS[ticket.priority]}`}>
                          ● {ticket.priority}
                        </span>
                        {isSla && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-400/20">
                            SLA BREACH
                          </span>
                        )}
                      </div>
                      <p className="text-white/90 text-sm font-medium truncate mt-1">
                        {ticket.asset?.name}
                      </p>
                      <p className="text-white/50 text-xs truncate">{ticket.category} · {ticket.requestedBy?.displayName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <div className="flex items-center gap-1 text-white/30 text-[10px]">
                        <MessageSquare className="w-3 h-3" />
                        {ticket._count?.comments}
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selectedTicket && selectedData && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card rounded-xl p-5 max-h-[60vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white/90 font-semibold">{selectedData.asset?.name}</h3>
                  <p className="text-white/40 text-xs">{selectedData.asset?.assetTag}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[selectedData.status]?.color}`}>
                  {STATUS_CONFIG[selectedData.status]?.label}
                </span>
              </div>

              <p className="text-white/70 text-sm">{selectedData.description}</p>

              {/* Timeline */}
              <div>
                <p className="text-xs text-white/40 mb-2 font-medium">Timeline</p>
                <div className="space-y-2">
                  {selectedData.timeline?.map((t: any, i: number) => (
                    <div key={t.id} className="flex gap-3 items-start">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        i === 0 ? 'bg-electric' : 'bg-white/20'
                      }`} />
                      <div>
                        <p className="text-white/70 text-xs">{STATUS_CONFIG[t.status]?.label}</p>
                        {t.notes && <p className="text-white/40 text-[11px]">{t.notes}</p>}
                        <p className="text-white/30 text-[10px]">
                          {t.changedBy?.displayName} · {new Date(t.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Advance stage */}
              {selectedData.status !== 'CLOSED' && selectedData.status !== 'REJECTED' && (
                <div className="space-y-2">
                  <p className="text-xs text-white/40 font-medium">Advance to next stage</p>
                  <div className="flex flex-wrap gap-2">
                    {getNextStages(selectedData.status).map(next => (
                      <button
                        key={next}
                        onClick={() => advanceMutation.mutate({ id: selectedData.id, data: { newStatus: next } })}
                        disabled={advanceMutation.isPending}
                        className="text-xs px-3 py-1.5 rounded-lg bg-electric/10 border border-electric/30 text-electric hover:bg-electric/20 transition-colors"
                      >
                        → {STATUS_CONFIG[next]?.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-medium">Comments</p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {selectedData.comments?.map((c: any) => (
                    <div key={c.id} className="bg-white/[0.03] rounded-lg p-2">
                      <p className="text-white/70 text-xs">{c.content}</p>
                      <p className="text-white/30 text-[10px] mt-1">{c.author?.displayName}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none focus:border-electric/50"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        commentMutation.mutate({ id: selectedData.id, content: commentText });
                        setCommentText('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (commentText.trim()) {
                        commentMutation.mutate({ id: selectedData.id, content: commentText });
                        setCommentText('');
                      }
                    }}
                    className="px-3 py-2 bg-electric/20 text-electric rounded-lg text-xs hover:bg-electric/30 transition-colors"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create ticket modal */}
      <AnimatePresence>
        {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

function getNextStages(status: string): string[] {
  const map: Record<string, string[]> = {
    SUBMITTED:       ['UNDER_REVIEW', 'REJECTED'],
    UNDER_REVIEW:    ['APPROVED', 'REJECTED'],
    APPROVED:        ['VENDOR_ASSIGNED', 'IN_REPAIR'],
    VENDOR_ASSIGNED: ['IN_REPAIR'],
    IN_REPAIR:       ['QC_CHECK'],
    QC_CHECK:        ['REPAIRED', 'IN_REPAIR'],
    REPAIRED:        ['RETURNED'],
    RETURNED:        ['CLOSED'],
  };
  return map[status] ?? [];
}

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    assetId: '',
    priority: 'MEDIUM',
    category: 'HARDWARE',
    description: '',
    estimatedCost: '',
  });

  const mutation = useMutation({
    mutationFn: (data: object) => repairApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['repair-tickets'] });
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
        <h2 className="text-lg font-semibold text-white">New Repair Ticket</h2>

        <input
          value={form.assetId}
          onChange={e => setForm(f => ({ ...f, assetId: e.target.value }))}
          placeholder="Asset ID"
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm"
        />

        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.priority}
            onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white focus:outline-none focus:border-electric/50 text-sm"
          >
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            value={form.category}
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white focus:outline-none focus:border-electric/50 text-sm"
          >
            {['HARDWARE', 'SOFTWARE', 'NETWORK', 'PERIPHERAL', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe the issue in detail..."
          rows={3}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm resize-none"
        />

        <input
          type="number"
          value={form.estimatedCost}
          onChange={e => setForm(f => ({ ...f, estimatedCost: e.target.value }))}
          placeholder="Estimated cost (optional)"
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={() => mutation.mutate({
              ...form,
              estimatedCost: form.estimatedCost ? +form.estimatedCost : undefined,
            })}
            disabled={!form.assetId || !form.description || mutation.isPending}
            className="flex-1 btn-primary disabled:opacity-50 text-sm"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
