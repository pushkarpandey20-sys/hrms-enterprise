import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { helpdeskApi } from '../../services/api';
import {
  HelpCircle, Plus, Search, BookOpen, MessageSquare,
  CheckCircle2, Clock, AlertTriangle, Star, Filter, ThumbsUp, ThumbsDown,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  OPEN:         { label: 'Open',         color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  IN_PROGRESS:  { label: 'In Progress',  color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  PENDING_INFO: { label: 'Pending Info', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
  RESOLVED:     { label: 'Resolved',     color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  CLOSED:       { label: 'Closed',       color: 'text-white/30 bg-white/5 border-white/10' },
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'text-red-400',
  HIGH:     'text-orange-400',
  MEDIUM:   'text-yellow-400',
  LOW:      'text-green-400',
};

const TYPE_ICONS: Record<string, string> = {
  IT: '💻', HR: '👥', FACILITIES: '🏢', FINANCE: '💰', OTHER: '📋',
};

type HelpTab = 'my-tickets' | 'all-tickets' | 'knowledge-base';

export default function HelpdeskPage() {
  const [tab, setTab] = useState<HelpTab>('my-tickets');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Helpdesk</h1>
          <p className="text-white/50 text-sm mt-1">IT · HR · Facilities support tickets</p>
        </div>
        <HelpCircle className="w-8 h-8 text-electric/70" />
      </div>

      <div className="flex gap-1 glass-card p-1 rounded-xl w-fit">
        {(['my-tickets', 'all-tickets', 'knowledge-base'] as HelpTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? 'bg-electric text-white shadow-glow' : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'my-tickets' ? 'My Tickets' : t === 'all-tickets' ? 'All Tickets' : 'Knowledge Base'}
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
          {tab === 'my-tickets' && <MyTickets />}
          {tab === 'all-tickets' && <AllTickets />}
          {tab === 'knowledge-base' && <KnowledgeBase />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── My Tickets ───────────────────────────────────────────────────────────────

function MyTickets() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [commentText, setCommentText] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-helpdesk-tickets'],
    queryFn: () => helpdeskApi.getMyTickets().then(r => r.data),
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['helpdesk-ticket', selectedTicket?.id],
    queryFn: () => selectedTicket ? helpdeskApi.getTicket(selectedTicket.id).then(r => r.data.data) : null,
    enabled: !!selectedTicket,
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, content }: { id: string; content: string }) =>
      helpdeskApi.addComment(id, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['helpdesk-ticket', selectedTicket?.id] });
      setCommentText('');
    },
  });

  const csatMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: number }) =>
      helpdeskApi.submitCsat(id, rating),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-helpdesk-tickets'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ticket list */}
        <div className="space-y-3 max-h-[65vh] overflow-y-auto">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="glass-card rounded-xl h-20 animate-pulse" />)
          ) : data?.tickets?.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <HelpCircle className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No tickets yet</p>
            </div>
          ) : (
            data?.tickets?.map((ticket: any) => (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`w-full glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-colors ${
                  selectedTicket?.id === ticket.id ? 'ring-1 ring-electric' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span>{TYPE_ICONS[ticket.category?.type]}</span>
                      <span className={`text-xs font-medium ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                      {ticket.isSlaBreached && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-400/20">
                          SLA
                        </span>
                      )}
                    </div>
                    <p className="text-white/90 text-sm font-medium truncate mt-1">{ticket.subject}</p>
                    <p className="text-white/40 text-xs">{ticket.category?.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[ticket.status]?.color}`}>
                      {STATUS_CONFIG[ticket.status]?.label}
                    </span>
                    {ticket.csatRating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-gold fill-gold" />
                        <span className="text-xs text-white/60">{ticket.csatRating}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Ticket detail */}
        <AnimatePresence>
          {selectedTicket && ticketDetail && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card rounded-xl p-5 max-h-[65vh] overflow-y-auto space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-white/90 font-semibold">{ticketDetail.subject}</h3>
                  <p className="text-white/40 text-xs">{ticketDetail.category?.name} · {ticketDetail.type}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_CONFIG[ticketDetail.status]?.color}`}>
                  {STATUS_CONFIG[ticketDetail.status]?.label}
                </span>
              </div>

              <p className="text-white/70 text-sm">{ticketDetail.description}</p>

              {ticketDetail.assignedTo && (
                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span>Assigned to:</span>
                  <span className="text-white/80">{ticketDetail.assignedTo.displayName}</span>
                </div>
              )}

              {/* SLA deadline */}
              {ticketDetail.slaDeadline && (
                <div className="flex items-center gap-2 text-xs">
                  <Clock className="w-3.5 h-3.5 text-white/30" />
                  <span className={ticketDetail.isSlaBreached ? 'text-red-400' : 'text-white/50'}>
                    SLA: {new Date(ticketDetail.slaDeadline).toLocaleString()}
                    {ticketDetail.isSlaBreached && ' (BREACHED)'}
                  </span>
                </div>
              )}

              {/* Comments */}
              <div className="space-y-2">
                <p className="text-xs text-white/40 font-medium">Activity</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {ticketDetail.comments?.map((c: any) => (
                    <div
                      key={c.id}
                      className={`rounded-lg p-2 ${c.isInternal ? 'bg-yellow-400/5 border border-yellow-400/10' : 'bg-white/[0.03]'}`}
                    >
                      <p className="text-white/70 text-xs">{c.content}</p>
                      <p className="text-white/30 text-[10px] mt-0.5">
                        {c.author?.displayName} · {new Date(c.createdAt).toLocaleDateString()}
                        {c.isInternal && <span className="ml-1 text-yellow-400/50">(Internal)</span>}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add reply..."
                    className="flex-1 bg-white/[0.06] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-xs placeholder-white/30 focus:outline-none"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && commentText.trim()) {
                        commentMutation.mutate({ id: ticketDetail.id, content: commentText });
                      }
                    }}
                  />
                  <button
                    onClick={() => commentText.trim() && commentMutation.mutate({ id: ticketDetail.id, content: commentText })}
                    className="px-3 py-2 bg-electric/20 text-electric rounded-lg text-xs"
                  >
                    Send
                  </button>
                </div>
              </div>

              {/* CSAT */}
              {ticketDetail.status === 'RESOLVED' && !ticketDetail.csatRating && (
                <div className="space-y-2 p-3 bg-white/[0.03] rounded-xl">
                  <p className="text-xs text-white/60">Rate your experience</p>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(rating => (
                      <button
                        key={rating}
                        onClick={() => csatMutation.mutate({ id: ticketDetail.id, rating })}
                        className="p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <Star className={`w-5 h-5 ${rating <= 3 ? 'text-white/30' : 'text-gold'}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
      </AnimatePresence>
    </div>
  );
}

// ─── All Tickets (Agent View) ─────────────────────────────────────────────────

function AllTickets() {
  const [filter, setFilter] = useState({ status: '', type: '', priority: '' });

  const { data, isLoading } = useQuery({
    queryKey: ['all-helpdesk-tickets', filter],
    queryFn: () => helpdeskApi.listTickets({
      status: filter.status || undefined,
      type: filter.type || undefined,
      priority: filter.priority || undefined,
    }).then(r => r.data),
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: 'status', options: ['', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], label: 'Status' },
          { key: 'type', options: ['', 'IT', 'HR', 'FACILITIES', 'FINANCE', 'OTHER'], label: 'Type' },
          { key: 'priority', options: ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'], label: 'Priority' },
        ].map(({ key, options, label }) => (
          <select
            key={key}
            value={filter[key as keyof typeof filter]}
            onChange={e => setFilter(f => ({ ...f, [key]: e.target.value }))}
            className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
          >
            <option value="">All {label}</option>
            {options.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="glass-card rounded-xl h-16 animate-pulse" />)}</div>
      ) : (
        <div className="space-y-2">
          {data?.tickets?.map((t: any) => (
            <div key={t.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-lg">{TYPE_ICONS[t.type]}</span>
                <div>
                  <p className="text-white/90 text-sm font-medium">{t.subject}</p>
                  <p className="text-white/40 text-xs">{t.requestedBy?.displayName} · {t.category?.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_CONFIG[t.status]?.color}`}>
                  {STATUS_CONFIG[t.status]?.label}
                </span>
                {t.isSlaBreached && <AlertTriangle className="w-4 h-4 text-red-400" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

function KnowledgeBase() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const qc = useQueryClient();

  const { data: articles, isLoading } = useQuery({
    queryKey: ['kb-articles', query, category],
    queryFn: () => helpdeskApi.searchArticles(query || undefined, category || undefined).then(r => r.data.data),
    enabled: true,
  });

  const rateMutation = useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      helpdeskApi.rateArticle(id, helpful),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kb-articles'] }),
  });

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search knowledge base..."
            className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm"
          />
        </div>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2 text-white text-sm focus:outline-none"
        >
          <option value="">All Categories</option>
          {['IT', 'HR', 'FACILITIES', 'FINANCE', 'OTHER'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Article list */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            [...Array(3)].map((_, i) => <div key={i} className="glass-card rounded-xl h-16 animate-pulse" />)
          ) : articles?.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <BookOpen className="w-8 h-8 text-white/20 mx-auto mb-3" />
              <p className="text-white/40">No articles found</p>
            </div>
          ) : (
            articles?.map((article: any) => (
              <button
                key={article.id}
                onClick={() => setSelectedArticle(article)}
                className={`w-full glass-card rounded-xl p-4 text-left hover:bg-white/[0.04] transition-colors ${
                  selectedArticle?.id === article.id ? 'ring-1 ring-electric' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium truncate">{article.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-electric/70 uppercase">{article.category}</span>
                      <span className="text-[10px] text-white/30">{article.viewCount} views</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/30 shrink-0">
                    <ThumbsUp className="w-3 h-3" />
                    {article.helpfulCount}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Article content */}
        <AnimatePresence>
          {selectedArticle && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="glass-card rounded-xl p-5 max-h-[60vh] overflow-y-auto space-y-4"
            >
              <div>
                <h3 className="text-white/90 font-semibold">{selectedArticle.title}</h3>
                <p className="text-white/40 text-xs mt-1">
                  by {selectedArticle.author?.displayName} · {selectedArticle.viewCount} views
                </p>
              </div>

              <div className="text-white/70 text-sm whitespace-pre-wrap leading-relaxed">
                {selectedArticle.content}
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
                <span className="text-xs text-white/40">Was this helpful?</span>
                <button
                  onClick={() => rateMutation.mutate({ id: selectedArticle.id, helpful: true })}
                  className="flex items-center gap-1 text-xs text-green-400 hover:bg-green-400/10 px-2 py-1 rounded-lg transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  Yes ({selectedArticle.helpfulCount})
                </button>
                <button
                  onClick={() => rateMutation.mutate({ id: selectedArticle.id, helpful: false })}
                  className="flex items-center gap-1 text-xs text-red-400 hover:bg-red-400/10 px-2 py-1 rounded-lg transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  No ({selectedArticle.notHelpfulCount})
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Create Ticket Modal ──────────────────────────────────────────────────────

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    categoryId: '',
    subject: '',
    description: '',
    priority: 'MEDIUM',
  });

  const { data: categories } = useQuery({
    queryKey: ['helpdesk-categories'],
    queryFn: () => helpdeskApi.listCategories().then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (data: object) => helpdeskApi.createTicket(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-helpdesk-tickets'] });
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
        <h2 className="text-lg font-semibold text-white">Submit Support Ticket</h2>

        <select
          value={form.categoryId}
          onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
        >
          <option value="">Select Category</option>
          {categories?.map((c: any) => (
            <option key={c.id} value={c.id}>{TYPE_ICONS[c.type]} {c.name}</option>
          ))}
        </select>

        <input
          value={form.subject}
          onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
          placeholder="Subject"
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm"
        />

        <select
          value={form.priority}
          onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-3 text-white text-sm focus:outline-none"
        >
          {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Describe your issue..."
          rows={4}
          className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none text-sm resize-none"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 text-sm">Cancel</button>
          <button
            onClick={() => mutation.mutate(form)}
            disabled={!form.categoryId || !form.subject || !form.description || mutation.isPending}
            className="flex-1 btn-primary disabled:opacity-50 text-sm"
          >
            {mutation.isPending ? 'Submitting...' : 'Submit Ticket'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
