import { View, Text, ScrollView, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services/api';
import { useAuthStore } from '@/src/stores/authStore';
import { useState } from 'react';

const KPI_CARDS = [
  { key: 'totalEmployees', label: 'Total Employees', icon: 'people-outline', color: '#3B82F6' },
  { key: 'presentToday', label: 'Present Today', icon: 'checkmark-circle-outline', color: '#10B981' },
  { key: 'onLeaveToday', label: 'On Leave', icon: 'calendar-outline', color: '#F59E0B' },
  { key: 'attendanceRate', label: 'Attendance Rate', icon: 'trending-up-outline', color: '#6366F1', suffix: '%' },
];

const QUICK_ACTIONS = [
  { label: 'Clock In', icon: 'log-in-outline', color: '#10B981', route: '/attendance' },
  { label: 'Apply Leave', icon: 'calendar-outline', color: '#3B82F6', route: '/leave' },
  { label: 'My Payslips', icon: 'document-text-outline', color: '#F59E0B', route: '/payslips' },
  { label: 'Directory', icon: 'people-outline', color: '#8B5CF6', route: '/profile' },
];

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  const { data, refetch } = useQuery({
    queryKey: ['mobile', 'dashboard'],
    queryFn: () => api.get('/dashboard/hr').then(r => r.data.data),
  });

  const onRefresh = async () => { setRefreshing(true); await refetch(); setRefreshing(false); };

  return (
    <ScrollView style={styles.container} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Good morning 👋</Text>
          <Text style={styles.name}>{user?.role?.replace('_', ' ')}</Text>
        </View>
        <TouchableOpacity style={styles.notifBtn}><Ionicons name="notifications-outline" size={22} color="#9CA3AF" /></TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiGrid}>
        {KPI_CARDS.map(({ key, label, icon, color, suffix }) => (
          <View key={key} style={styles.kpiCard}>
            <View style={[styles.kpiIcon, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <Text style={styles.kpiValue}>{data?.kpis?.[key] ?? '--'}{suffix || ''}</Text>
            <Text style={styles.kpiLabel}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {QUICK_ACTIONS.map(({ label, icon, color, route }) => (
          <TouchableOpacity key={label} style={styles.actionCard} onPress={() => router.push(route as any)}>
            <View style={[styles.actionIcon, { backgroundColor: `${color}20` }]}>
              <Ionicons name={icon as any} size={24} color={color} />
            </View>
            <Text style={styles.actionLabel}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Today's attendance status */}
      <Text style={styles.sectionTitle}>Today's Status</Text>
      <View style={styles.statusCard}>
        <View style={styles.statusRow}>
          <Text style={styles.statusLabel}>Present</Text>
          <Text style={[styles.statusValue, { color: '#10B981' }]}>{data?.kpis?.presentToday ?? '--'}</Text>
        </View>
        <View style={[styles.statusRow, { borderTopWidth: 1, borderTopColor: '#1F2937' }]}>
          <Text style={styles.statusLabel}>On Leave</Text>
          <Text style={[styles.statusValue, { color: '#F59E0B' }]}>{data?.kpis?.onLeaveToday ?? '--'}</Text>
        </View>
        <View style={[styles.statusRow, { borderTopWidth: 1, borderTopColor: '#1F2937' }]}>
          <Text style={styles.statusLabel}>Attendance Rate</Text>
          <Text style={[styles.statusValue, { color: '#3B82F6' }]}>{data?.kpis?.attendanceRate ?? '--'}%</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '800', color: '#F9FAFB' },
  name: { fontSize: 13, color: '#6B7280', marginTop: 2, textTransform: 'capitalize' },
  notifBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 24 },
  kpiCard: { flex: 1, minWidth: '45%', backgroundColor: '#111827', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#1F2937' },
  kpiIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  kpiValue: { fontSize: 26, fontWeight: '800', color: '#F9FAFB' },
  kpiLabel: { fontSize: 11, color: '#6B7280', marginTop: 2, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 20, marginBottom: 12 },
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, marginBottom: 28 },
  actionCard: { flex: 1, minWidth: '45%', backgroundColor: '#111827', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#1F2937' },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { fontSize: 12, fontWeight: '600', color: '#D1D5DB' },
  statusCard: { marginHorizontal: 16, marginBottom: 32, backgroundColor: '#111827', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2937' },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  statusLabel: { fontSize: 14, color: '#9CA3AF' },
  statusValue: { fontSize: 18, fontWeight: '700' },
});
