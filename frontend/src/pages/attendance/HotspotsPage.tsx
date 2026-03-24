import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Wifi, MapPin, Trash2, Users, UserPlus, UserMinus, X } from 'lucide-react';
import { attendanceApi, employeeApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

export default function HotspotsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<'wifi' | 'gps'>('wifi');
  const [showAddHotspot, setShowAddHotspot] = useState(false);
  const [showAddFence, setShowAddFence] = useState(false);
  const [assignModal, setAssignModal] = useState<{ type: 'wifi' | 'gps'; id: string; name: string } | null>(null);
  const [form, setForm] = useState({ name: '', ssid: '', bssid: '', locationName: '' });
  const [fenceForm, setFenceForm] = useState({ name: '', latitude: '', longitude: '', radius: '200', address: '' });
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const { data: hotspots = [] } = useQuery({
    queryKey: ['hotspots'],
    queryFn: () => attendanceApi.listHotspots().then(r => r.data.data),
  });

  const { data: geoFences = [] } = useQuery({
    queryKey: ['geofences'],
    queryFn: () => attendanceApi.listGeoFences().then(r => r.data.data),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['employees-list'],
    queryFn: () => employeeApi.list({ limit: 200 }).then(r => r.data.data),
  });

  const createHotspot = useMutation({
    mutationFn: (data: object) => attendanceApi.createHotspot(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotspots'] }); setShowAddHotspot(false); setForm({ name: '', ssid: '', bssid: '', locationName: '' }); toast({ title: 'Hotspot created' }); },
  });

  const deleteHotspot = useMutation({
    mutationFn: (id: string) => attendanceApi.deleteHotspot(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotspots'] }); toast({ title: 'Hotspot deleted' }); },
  });

  const createFence = useMutation({
    mutationFn: (data: object) => attendanceApi.createGeoFence(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['geofences'] }); setShowAddFence(false); setFenceForm({ name: '', latitude: '', longitude: '', radius: '200', address: '' }); toast({ title: 'GeoFence created' }); },
  });

  const deleteFence = useMutation({
    mutationFn: (id: string) => attendanceApi.deleteGeoFence(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['geofences'] }); toast({ title: 'GeoFence deleted' }); },
  });

  const assignHotspot = useMutation({
    mutationFn: ({ empId, id }: { empId: string; id: string }) => attendanceApi.assignHotspot(empId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotspots'] }); toast({ title: 'Assigned to employee' }); setSelectedEmployee(''); },
  });

  const removeHotspot = useMutation({
    mutationFn: ({ empId, id }: { empId: string; id: string }) => attendanceApi.removeHotspot(empId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hotspots'] }); toast({ title: 'Removed from employee' }); },
  });

  const assignFence = useMutation({
    mutationFn: ({ empId, id }: { empId: string; id: string }) => attendanceApi.assignGeoFence(empId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['geofences'] }); toast({ title: 'Assigned to employee' }); setSelectedEmployee(''); },
  });

  const removeFence = useMutation({
    mutationFn: ({ empId, id }: { empId: string; id: string }) => attendanceApi.removeGeoFence(empId, id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['geofences'] }); toast({ title: 'Removed from employee' }); },
  });

  const handleAssign = () => {
    if (!selectedEmployee || !assignModal) return;
    if (assignModal.type === 'wifi') {
      assignHotspot.mutate({ empId: selectedEmployee, id: assignModal.id });
    } else {
      assignFence.mutate({ empId: selectedEmployee, id: assignModal.id });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Location Management</h1>
          <p className="text-muted-foreground text-sm">Manage WiFi hotspots and GPS geofences for attendance</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/40 rounded-lg p-1 w-fit">
        {([['wifi', '📶 WiFi Hotspots'], ['gps', '📍 GPS GeoFences']] as const).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${tab === key ? 'bg-secondary text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* WiFi Hotspots Tab */}
      {tab === 'wifi' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddHotspot(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add Hotspot
            </Button>
          </div>

          {showAddHotspot && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">New WiFi Hotspot</h3>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Name (e.g. HO, Noida Office)" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                <input className="input-field" placeholder="WiFi SSID" value={form.ssid} onChange={e => setForm(f => ({ ...f, ssid: e.target.value }))} />
                <input className="input-field" placeholder="BSSID (optional)" value={form.bssid} onChange={e => setForm(f => ({ ...f, bssid: e.target.value }))} />
                <input className="input-field" placeholder="Location name" value={form.locationName} onChange={e => setForm(f => ({ ...f, locationName: e.target.value }))} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createHotspot.mutate(form)} disabled={!form.name || !form.ssid}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddHotspot(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotspots.map((hs: any) => (
              <motion.div key={hs.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Wifi className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{hs.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{hs.ssid}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setAssignModal({ type: 'wifi', id: hs.id, name: hs.name })} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-electric">
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteHotspot.mutate(hs.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {hs.locationName && <p className="text-xs text-muted-foreground mb-2">📍 {hs.locationName}</p>}
                <div className="border-t border-border/50 pt-2">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Assigned Employees ({hs.employees?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {hs.employees?.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-1 bg-secondary/50 rounded-full px-2 py-0.5 text-xs">
                        <span>{emp.firstName} {emp.lastName}</span>
                        <button onClick={() => removeHotspot.mutate({ empId: emp.id, id: hs.id })} className="text-muted-foreground hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!hs.employees || hs.employees.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">No employees (applies to all)</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {hotspots.length === 0 && !showAddHotspot && (
            <div className="glass-card p-10 text-center text-muted-foreground text-sm">
              <Wifi className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No WiFi hotspots configured. Add hotspots to enable location-based attendance.
            </div>
          )}
        </div>
      )}

      {/* GPS GeoFences Tab */}
      {tab === 'gps' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowAddFence(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add GeoFence
            </Button>
          </div>

          {showAddFence && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="font-semibold text-sm">New GPS GeoFence</h3>
              <div className="grid grid-cols-2 gap-3">
                <input className="input-field" placeholder="Name (e.g. HO, Noida)" value={fenceForm.name} onChange={e => setFenceForm(f => ({ ...f, name: e.target.value }))} />
                <input className="input-field" placeholder="Address" value={fenceForm.address} onChange={e => setFenceForm(f => ({ ...f, address: e.target.value }))} />
                <input className="input-field" placeholder="Latitude (e.g. 28.6139)" value={fenceForm.latitude} onChange={e => setFenceForm(f => ({ ...f, latitude: e.target.value }))} />
                <input className="input-field" placeholder="Longitude (e.g. 77.2090)" value={fenceForm.longitude} onChange={e => setFenceForm(f => ({ ...f, longitude: e.target.value }))} />
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">Radius: {fenceForm.radius}m</label>
                  <input type="range" min="50" max="2000" step="50" value={fenceForm.radius} onChange={e => setFenceForm(f => ({ ...f, radius: e.target.value }))} className="w-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => createFence.mutate({ ...fenceForm, latitude: Number(fenceForm.latitude), longitude: Number(fenceForm.longitude), radius: Number(fenceForm.radius) })} disabled={!fenceForm.name || !fenceForm.latitude || !fenceForm.longitude}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setShowAddFence(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {geoFences.map((fence: any) => (
              <motion.div key={fence.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{fence.name}</p>
                      <p className="text-xs text-muted-foreground">{fence.latitude.toFixed(4)}, {fence.longitude.toFixed(4)}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setAssignModal({ type: 'gps', id: fence.id, name: fence.name })} className="p-1.5 rounded hover:bg-secondary transition-colors text-muted-foreground hover:text-electric">
                      <UserPlus className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteFence.mutate(fence.id)} className="p-1.5 rounded hover:bg-red-500/10 transition-colors text-muted-foreground hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-2">Radius: {fence.radius}m {fence.address && `· ${fence.address}`}</p>
                <div className="border-t border-border/50 pt-2">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Users className="w-3 h-3" /> Assigned Employees ({fence.employees?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {fence.employees?.map((emp: any) => (
                      <div key={emp.id} className="flex items-center gap-1 bg-secondary/50 rounded-full px-2 py-0.5 text-xs">
                        <span>{emp.firstName} {emp.lastName}</span>
                        <button onClick={() => removeFence.mutate({ empId: emp.id, id: fence.id })} className="text-muted-foreground hover:text-red-400">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!fence.employees || fence.employees.length === 0) && (
                      <span className="text-xs text-muted-foreground italic">No employees (applies to all)</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
          {geoFences.length === 0 && !showAddFence && (
            <div className="glass-card p-10 text-center text-muted-foreground text-sm">
              <MapPin className="w-10 h-10 mx-auto mb-2 opacity-30" />
              No GPS geofences configured. Add a geofence for location-based attendance.
            </div>
          )}
        </div>
      )}

      {/* Assign Employee Modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-midnight border border-border rounded-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">Assign Employee to "{assignModal.name}"</h3>
              <button onClick={() => setAssignModal(null)}><X className="w-4 h-4" /></button>
            </div>
            <select className="input-field w-full" value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)}>
              <option value="">Select employee...</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAssign} disabled={!selectedEmployee} className="flex-1">Assign</Button>
              <Button size="sm" variant="outline" onClick={() => setAssignModal(null)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
