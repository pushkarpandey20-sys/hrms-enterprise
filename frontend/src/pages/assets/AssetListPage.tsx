import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Package, Plus, Search, Download, QrCode, Upload } from 'lucide-react';
import { assetApi } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from '@/components/ui/skeleton';
import { formatCurrency, downloadBlob } from '@/lib/utils';

export default function AssetListPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newAsset, setNewAsset] = useState({ name: '', serialNumber: '', model: '', purchaseCost: '' });
  const qc = useQueryClient();

  const { data: assets, isLoading } = useQuery({
    queryKey: ['assets', search, status],
    queryFn: () => assetApi.list({ search, status }).then(r => r.data.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['asset-categories'],
    queryFn: () => assetApi.getCategories().then(r => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => assetApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['assets'] }); setShowCreate(false); },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Assets</h1>
          <p className="text-muted-foreground text-sm">{assets?.length || 0} assets registered</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Upload className="w-4 h-4" /> Import</Button>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Add Asset</Button>
        </div>
      </div>

      {/* Summary cards */}
      {assets && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: assets.length, color: 'text-foreground' },
            { label: 'Available', value: assets.filter((a: any) => a.status === 'AVAILABLE').length, color: 'text-emerald-400' },
            { label: 'Assigned', value: assets.filter((a: any) => a.status === 'ASSIGNED').length, color: 'text-blue-400' },
            { label: 'Under Maintenance', value: assets.filter((a: any) => a.status === 'UNDER_MAINTENANCE').length, color: 'text-yellow-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 text-center">
              <p className={`font-display text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-2 flex-1 max-w-xs">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent text-sm placeholder:text-muted-foreground/60 flex-1 outline-none"
            placeholder="Search assets..." />
        </div>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="bg-secondary/50 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-electric/50">
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
        </select>
      </div>

      {/* Create modal */}
      {showCreate && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md">
            <h2 className="font-display text-xl font-bold mb-4">Add New Asset</h2>
            <div className="space-y-3">
              {[
                { key: 'name', label: 'Asset Name', placeholder: 'MacBook Pro M3' },
                { key: 'serialNumber', label: 'Serial Number', placeholder: 'SN12345' },
                { key: 'model', label: 'Model', placeholder: 'MBP 14" 2024' },
                { key: 'purchaseCost', label: 'Purchase Cost (₹)', placeholder: '150000' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</label>
                  <input value={(newAsset as any)[key]} onChange={e => setNewAsset(prev => ({ ...prev, [key]: e.target.value }))} placeholder={placeholder}
                    className="mt-1 w-full h-9 px-3 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric/50" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
              <Button onClick={() => createMutation.mutate({ ...newAsset, purchaseCost: Number(newAsset.purchaseCost) })}
                loading={createMutation.isPending} className="flex-1">Create Asset</Button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? <div className="p-4"><TableSkeleton rows={6} cols={7} /></div> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['Asset', 'Code', 'Category', 'Serial No', 'Cost', 'Status', 'Assigned To'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assets?.map((asset: any, i: number) => (
                <motion.tr key={asset.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-border/50 table-row-hover">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-electric/10 flex items-center justify-center flex-shrink-0">
                        <Package className="w-4 h-4 text-electric" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{asset.name}</p>
                        <p className="text-xs text-muted-foreground">{asset.model}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{asset.assetCode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.category?.name || '-'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{asset.serialNumber || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{asset.purchaseCost ? formatCurrency(asset.purchaseCost) : '-'}</td>
                  <td className="px-4 py-3"><Badge variant={asset.status}>{asset.status.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {asset.assignments?.[0]?.employee ? `${asset.assignments[0].employee.firstName} ${asset.assignments[0].employee.lastName}` : '-'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
