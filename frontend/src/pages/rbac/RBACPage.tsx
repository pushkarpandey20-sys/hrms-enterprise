import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { rbacApi } from '../../services/api';
import {
  Shield, Plus, Trash2, Edit2, Check, X, Users,
  Lock, Unlock, AlertTriangle, ChevronDown, ChevronRight, RefreshCw,
} from 'lucide-react';

type Tab = 'matrix' | 'roles' | 'reviews';

export default function RBACPage() {
  const [tab, setTab] = useState<Tab>('matrix');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Access Control</h1>
          <p className="text-white/50 text-sm mt-1">Manage roles, permissions, and access reviews</p>
        </div>
        <Shield className="w-8 h-8 text-electric/70" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass-card p-1 rounded-xl w-fit">
        {(['matrix', 'roles', 'reviews'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
              tab === t
                ? 'bg-electric text-white shadow-glow'
                : 'text-white/50 hover:text-white'
            }`}
          >
            {t === 'matrix' ? 'Permission Matrix' : t === 'roles' ? 'Roles' : 'Access Reviews'}
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
          {tab === 'matrix' && <PermissionMatrix />}
          {tab === 'roles' && <RolesManager />}
          {tab === 'reviews' && <AccessReviews />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Permission Matrix ────────────────────────────────────────────────────────

function PermissionMatrix() {
  const { data, isLoading } = useQuery({
    queryKey: ['rbac-matrix'],
    queryFn: () => rbacApi.getMatrix().then(r => r.data.data),
  });

  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [filterModule, setFilterModule] = useState('');

  if (isLoading) return <MatrixSkeleton />;
  if (!data) return null;

  const { matrix, permissions } = data;
  const modules = [...new Set(permissions.map((p: any) => p.module))];
  const filteredPerms = filterModule
    ? permissions.filter((p: any) => p.module === filterModule)
    : permissions;

  return (
    <div className="space-y-4">
      {/* Module filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterModule('')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
            !filterModule ? 'bg-electric text-white' : 'glass-card text-white/50 hover:text-white'
          }`}
        >
          All Modules
        </button>
        {modules.map((m: string) => (
          <button
            key={m}
            onClick={() => setFilterModule(m)}
            className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
              filterModule === m ? 'bg-electric text-white' : 'glass-card text-white/50 hover:text-white'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Matrix grid */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-white/50 font-medium min-w-[200px]">User</th>
                {filteredPerms.slice(0, 20).map((p: any) => (
                  <th
                    key={p.id}
                    title={p.key}
                    className="px-2 py-3 text-white/40 font-normal text-xs min-w-[40px] text-center"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] text-white/30 capitalize">{p.resource}</span>
                      <span className="text-[11px] capitalize">{p.action}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((user: any) => (
                <tr
                  key={user.userId}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white/90 font-medium text-sm">{user.displayName}</p>
                      <p className="text-white/40 text-xs">{user.email}</p>
                      <span className="text-[10px] text-electric/70">{user.roleCount} role{user.roleCount !== 1 ? 's' : ''}</span>
                    </div>
                  </td>
                  {filteredPerms.slice(0, 20).map((p: any) => {
                    const has = user.permissions.includes(p.key);
                    return (
                      <td key={p.id} className="px-2 py-3 text-center">
                        {has ? (
                          <div className="w-5 h-5 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto">
                            <Check className="w-3 h-3 text-green-400" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/[0.03] border border-white/[0.06] mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredPerms.length > 20 && (
          <div className="px-4 py-2 text-xs text-white/40 border-t border-white/[0.06]">
            Showing first 20 of {filteredPerms.length} permissions. Use module filter to narrow down.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Roles Manager ────────────────────────────────────────────────────────────

function RolesManager() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const { data: roles, isLoading } = useQuery({
    queryKey: ['rbac-roles'],
    queryFn: () => rbacApi.listRoles().then(r => r.data.data),
  });

  const { data: permissions } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: () => rbacApi.listPermissions().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => rbacApi.createRole(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rbac-roles'] });
      setShowCreate(false);
      setNewRoleName('');
      setNewRoleDesc('');
      setSelectedPerms([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rbacApi.deleteRole(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-roles'] }),
  });

  const modules = permissions ? [...new Set(permissions.map((p: any) => p.module))] as string[] : [];

  const togglePerm = (id: string) => {
    setSelectedPerms(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  if (isLoading) return <div className="text-white/40 text-sm">Loading roles...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles?.map((role: any) => (
          <motion.div
            key={role.id}
            layout
            className="glass-card rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white/90 font-semibold">{role.name}</h3>
                <p className="text-white/40 text-xs mt-1">{role.description || 'No description'}</p>
              </div>
              <div className="flex gap-2">
                {!role.isSystem && (
                  <button
                    onClick={() => deleteMutation.mutate(role.id)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50">
              <Users className="w-3.5 h-3.5" />
              <span>{role._count?.userRoles ?? 0} users</span>
              <span>·</span>
              <Lock className="w-3.5 h-3.5" />
              <span>{role.permissions?.length ?? 0} permissions</span>
            </div>

            {role.isSystem && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/20">
                System Role
              </span>
            )}

            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {role.permissions?.slice(0, 8).map((rp: any) => (
                <span
                  key={rp.id}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-electric/10 text-electric/80 border border-electric/20"
                >
                  {rp.permission?.key}
                </span>
              ))}
              {(role.permissions?.length ?? 0) > 8 && (
                <span className="text-[10px] text-white/30">
                  +{role.permissions.length - 8} more
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Create Role Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-white mb-4">Create Custom Role</h2>

              <div className="space-y-4">
                <input
                  value={newRoleName}
                  onChange={e => setNewRoleName(e.target.value)}
                  placeholder="Role name"
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50"
                />
                <input
                  value={newRoleDesc}
                  onChange={e => setNewRoleDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-electric/50"
                />

                <div>
                  <p className="text-sm text-white/60 mb-3">Select Permissions</p>
                  <div className="space-y-3">
                    {modules.map(module => {
                      const modulePerms = permissions?.filter((p: any) => p.module === module) ?? [];
                      const allSelected = modulePerms.every((p: any) => selectedPerms.includes(p.id));
                      return (
                        <div key={module} className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (allSelected) {
                                  setSelectedPerms(prev => prev.filter(id => !modulePerms.map((p: any) => p.id).includes(id)));
                                } else {
                                  setSelectedPerms(prev => [...new Set([...prev, ...modulePerms.map((p: any) => p.id)])]);
                                }
                              }}
                              className={`text-xs px-2 py-0.5 rounded capitalize font-medium transition-all ${
                                allSelected ? 'bg-electric text-white' : 'bg-white/[0.06] text-white/60'
                              }`}
                            >
                              {module}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2 ml-3">
                            {modulePerms.map((p: any) => (
                              <button
                                key={p.id}
                                onClick={() => togglePerm(p.id)}
                                className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                                  selectedPerms.includes(p.id)
                                    ? 'bg-electric/20 border-electric/50 text-electric'
                                    : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70'
                                }`}
                              >
                                {p.resource}:{p.action}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-white/[0.10] text-white/60 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createMutation.mutate({
                      name: newRoleName,
                      description: newRoleDesc,
                      permissionIds: selectedPerms,
                    })}
                    disabled={!newRoleName || createMutation.isPending}
                    className="flex-1 btn-primary disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Creating...' : `Create Role (${selectedPerms.length} perms)`}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Access Reviews ───────────────────────────────────────────────────────────

function AccessReviews() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['access-reviews'],
    queryFn: () => rbacApi.listReviews().then(r => r.data.data),
  });

  const statusColors: Record<string, string> = {
    PENDING: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    IN_PROGRESS: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    COMPLETED: 'text-green-400 bg-green-400/10 border-green-400/20',
    CANCELLED: 'text-red-400 bg-red-400/10 border-red-400/20',
  };

  if (isLoading) return <div className="text-white/40 text-sm">Loading reviews...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Access Review
        </button>
      </div>

      {reviews?.length === 0 && (
        <div className="glass-card rounded-xl p-8 text-center">
          <RefreshCw className="w-8 h-8 text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No access reviews yet</p>
          <p className="text-white/30 text-sm mt-1">Create quarterly access reviews to ensure least privilege</p>
        </div>
      )}

      <div className="space-y-3">
        {reviews?.map((review: any) => (
          <div key={review.id} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white/90 font-medium">{review.title}</h3>
                <p className="text-white/40 text-xs mt-1">
                  Initiated by {review.initiatedBy?.displayName} · Due {new Date(review.dueDate).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColors[review.status] ?? 'text-white/50'}`}>
                {review.status}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-white/50">
              <span>{review._count?.assignments ?? 0} assignments</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="glass-card rounded-xl p-6 animate-pulse">
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-white/[0.04] rounded-lg" />
        ))}
      </div>
    </div>
  );
}
