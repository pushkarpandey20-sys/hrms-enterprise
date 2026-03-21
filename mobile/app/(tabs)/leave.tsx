import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal, TextInput, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#F59E0B', APPROVED: '#10B981', REJECTED: '#EF4444',
  MGR_APPROVED: '#3B82F6', CANCELLED: '#6B7280',
};

export default function LeaveScreen() {
  const [showApply, setShowApply] = useState(false);
  const [form, setForm] = useState({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
  const qc = useQueryClient();

  const { data: leaves } = useQuery({ queryKey: ['my-leaves'], queryFn: () => api.get('/leave/my').then(r => r.data.data) });
  const { data: types } = useQuery({ queryKey: ['leave-types'], queryFn: () => api.get('/leave/types').then(r => r.data.data) });
  const { data: balances } = useQuery({ queryKey: ['leave-balances'], queryFn: () => api.get('/leave/balances').then(r => r.data.data) });

  const applyMutation = useMutation({
    mutationFn: () => api.post('/leave/apply', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-leaves'] }); setShowApply(false); Alert.alert('✅ Applied', 'Leave request submitted'); },
    onError: (err: any) => Alert.alert('Error', err?.response?.data?.error || 'Failed to apply'),
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>My Leave</Text>
        <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApply(true)}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={styles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
      </View>

      {/* Balance cards */}
      <Text style={styles.sectionTitle}>Leave Balance</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceRow}>
        {balances?.map((b: any) => (
          <View key={b.id} style={[styles.balanceCard, { borderTopColor: b.leaveType.color, borderTopWidth: 3 }]}>
            <Text style={styles.balanceDays}>{b.remainingDays}</Text>
            <Text style={styles.balanceName}>{b.leaveType.name}</Text>
            <Text style={styles.balanceSub}>{b.usedDays}/{b.totalDays} used</Text>
          </View>
        ))}
      </ScrollView>

      {/* Leave requests */}
      <Text style={styles.sectionTitle}>My Requests</Text>
      <View style={styles.leaveList}>
        {leaves?.map((l: any) => (
          <View key={l.id} style={styles.leaveItem}>
            <View style={styles.leaveLeft}>
              <View style={[styles.typeBadge, { backgroundColor: `${l.leaveType?.color || '#3B82F6'}20` }]}>
                <Text style={[styles.typeBadgeText, { color: l.leaveType?.color || '#3B82F6' }]}>{l.leaveType?.name}</Text>
              </View>
              <Text style={styles.leaveDates}>{new Date(l.startDate).toLocaleDateString()} → {new Date(l.endDate).toLocaleDateString()}</Text>
              <Text style={styles.leaveDays}>{l.totalDays} day{l.totalDays !== 1 ? 's' : ''}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[l.status]}20` }]}>
              <Text style={[styles.statusText, { color: STATUS_COLORS[l.status] }]}>{l.status.replace('_', ' ')}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Apply modal */}
      <Modal visible={showApply} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply for Leave</Text>
            <TouchableOpacity onPress={() => setShowApply(false)}><Ionicons name="close" size={24} color="#9CA3AF" /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            <Text style={styles.inputLabel}>Leave Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeSelector}>
              {types?.map((t: any) => (
                <TouchableOpacity key={t.id} onPress={() => setForm(f => ({ ...f, leaveTypeId: t.id }))}
                  style={[styles.typeOption, form.leaveTypeId === t.id && { borderColor: t.color, backgroundColor: `${t.color}20` }]}>
                  <Text style={[styles.typeOptionText, form.leaveTypeId === t.id && { color: t.color }]}>{t.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.inputLabel}>Start Date</Text>
            <TextInput style={styles.input} value={form.startDate} onChangeText={v => setForm(f => ({ ...f, startDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#6B7280" />
            <Text style={styles.inputLabel}>End Date</Text>
            <TextInput style={styles.input} value={form.endDate} onChangeText={v => setForm(f => ({ ...f, endDate: v }))} placeholder="YYYY-MM-DD" placeholderTextColor="#6B7280" />
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', paddingTop: 10 }]} value={form.reason} onChangeText={v => setForm(f => ({ ...f, reason: v }))} placeholder="Reason for leave" placeholderTextColor="#6B7280" multiline />
            <TouchableOpacity style={styles.submitBtn} onPress={() => applyMutation.mutate()}>
              <Text style={styles.submitBtnText}>Submit Application</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#F9FAFB' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3B82F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1.2, marginHorizontal: 20, marginBottom: 10 },
  balanceRow: { paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  balanceCard: { backgroundColor: '#111827', borderRadius: 14, padding: 16, width: 110, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  balanceDays: { fontSize: 28, fontWeight: '800', color: '#F9FAFB' },
  balanceName: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  balanceSub: { fontSize: 10, color: '#4B5563', marginTop: 2 },
  leaveList: { marginHorizontal: 16, marginBottom: 32, gap: 8 },
  leaveItem: { backgroundColor: '#111827', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1F2937' },
  leaveLeft: { flex: 1 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  typeBadgeText: { fontSize: 11, fontWeight: '700' },
  leaveDates: { fontSize: 12, color: '#D1D5DB', marginBottom: 2 },
  leaveDays: { fontSize: 11, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  modal: { flex: 1, backgroundColor: '#0A0F1E', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, marginBottom: 24 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#F9FAFB' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: { backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 10, padding: 12, color: '#F9FAFB', fontSize: 14 },
  typeSelector: { marginBottom: 4 },
  typeOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#374151', marginRight: 8, backgroundColor: '#1F2937' },
  typeOptionText: { fontSize: 13, color: '#9CA3AF', fontWeight: '600' },
  submitBtn: { backgroundColor: '#3B82F6', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 24, marginBottom: 32 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
