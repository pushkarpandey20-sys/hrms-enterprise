import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

type Mode = 'menu' | 'camera';

export default function AttendanceScreen() {
  const [mode, setMode] = useState<Mode>('menu');
  const [action, setAction] = useState<'in' | 'out'>('in');
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const qc = useQueryClient();

  const { data: myAttendance } = useQuery({
    queryKey: ['my-attendance-today'],
    queryFn: () => api.get('/attendance/my', { params: { limit: 5 } }).then(r => r.data.data),
    refetchInterval: 30000,
  });

  const todayRecord = myAttendance?.[0];
  const isClockedIn = todayRecord?.clockIn && !todayRecord?.clockOut;

  const handleCapture = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      // Get location
      let location: Location.LocationObject | null = null;
      try {
        location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      } catch {}

      // Take photo (in production, upload to FormData)
      // const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });

      const formData = new FormData();
      if (location) {
        formData.append('latitude', String(location.coords.latitude));
        formData.append('longitude', String(location.coords.longitude));
        formData.append('accuracy', String(location.coords.accuracy));
      }
      formData.append('source', location ? 'APP_GPS' : 'WEB');

      if (action === 'in') {
        await api.post('/attendance/clock-in', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert('✅ Clocked In', `Successfully clocked in at ${new Date().toLocaleTimeString()}`);
      } else {
        await api.post('/attendance/clock-out', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        Alert.alert('👋 Clocked Out', `Successfully clocked out at ${new Date().toLocaleTimeString()}`);
      }

      qc.invalidateQueries({ queryKey: ['my-attendance-today'] });
      setMode('menu');
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to record attendance');
    } finally {
      setCapturing(false);
    }
  };

  const startAction = async (type: 'in' | 'out') => {
    if (!permission?.granted) { await requestPermission(); }
    if (!locationPermission?.granted) { await requestLocationPermission(); }
    setAction(type);
    setMode('camera');
  };

  if (mode === 'camera') {
    return (
      <View style={camStyles.container}>
        <CameraView ref={cameraRef} style={camStyles.camera} facing="front">
          {/* Overlay */}
          <View style={camStyles.overlay}>
            <View style={camStyles.topBar}>
              <TouchableOpacity onPress={() => setMode('menu')} style={camStyles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={camStyles.title}>Clock {action === 'in' ? 'In' : 'Out'}</Text>
              <View style={{ width: 40 }} />
            </View>
            
            {/* Face guide */}
            <View style={camStyles.faceGuide}>
              <View style={camStyles.faceCircle} />
              <Text style={camStyles.guideText}>Position your face in the circle</Text>
            </View>

            {/* Capture button */}
            <View style={camStyles.bottomBar}>
              <Text style={camStyles.actionLabel}>{action === 'in' ? '🟢 Tap to Clock In' : '🔴 Tap to Clock Out'}</Text>
              <TouchableOpacity style={camStyles.captureBtn} onPress={handleCapture} disabled={capturing}>
                {capturing ? <ActivityIndicator color="#fff" size="large" /> : (
                  <View style={[camStyles.captureInner, { backgroundColor: action === 'in' ? '#10B981' : '#EF4444' }]} />
                )}
              </TouchableOpacity>
              <Text style={camStyles.timeText}>{new Date().toLocaleTimeString()}</Text>
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Attendance</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      {/* Today's status card */}
      <View style={styles.statusCard}>
        <View style={[styles.statusIndicator, { backgroundColor: isClockedIn ? '#10B98120' : '#EF444420' }]}>
          <Ionicons name={isClockedIn ? 'checkmark-circle' : 'time-outline'} size={36} color={isClockedIn ? '#10B981' : '#EF4444'} />
        </View>
        <Text style={styles.statusText}>{isClockedIn ? 'You are clocked in' : 'Not yet clocked in'}</Text>
        {todayRecord?.clockIn && (
          <Text style={styles.clockTime}>In: {new Date(todayRecord.clockIn).toLocaleTimeString()}</Text>
        )}
        {todayRecord?.clockOut && (
          <Text style={styles.clockTime}>Out: {new Date(todayRecord.clockOut).toLocaleTimeString()} · {Math.floor(todayRecord.workingMins / 60)}h {todayRecord.workingMins % 60}m</Text>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.actionBtn, styles.clockInBtn]} onPress={() => startAction('in')} disabled={isClockedIn}>
          <Ionicons name="log-in-outline" size={24} color={isClockedIn ? '#374151' : '#fff'} />
          <Text style={[styles.actionBtnText, isClockedIn && { color: '#374151' }]}>Clock In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.clockOutBtn]} onPress={() => startAction('out')} disabled={!isClockedIn}>
          <Ionicons name="log-out-outline" size={24} color={!isClockedIn ? '#374151' : '#fff'} />
          <Text style={[styles.actionBtnText, !isClockedIn && { color: '#374151' }]}>Clock Out</Text>
        </TouchableOpacity>
      </View>

      {/* Recent attendance */}
      <Text style={styles.sectionTitle}>Recent Attendance</Text>
      <View style={styles.historyList}>
        {myAttendance?.slice(0, 7)?.map((rec: any) => (
          <View key={rec.id} style={styles.historyItem}>
            <Text style={styles.historyDate}>{new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</Text>
            <Text style={styles.historyTime}>{rec.clockIn ? new Date(rec.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'} → {rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: rec.status === 'PRESENT' ? '#10B98120' : '#EF444420' }]}>
              <Text style={[styles.statusBadgeText, { color: rec.status === 'PRESENT' ? '#10B981' : '#EF4444' }]}>{rec.status}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#F9FAFB' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusCard: { margin: 16, backgroundColor: '#111827', borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  statusIndicator: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  statusText: { fontSize: 16, fontWeight: '700', color: '#F9FAFB' },
  clockTime: { fontSize: 13, color: '#9CA3AF', marginTop: 4 },
  actionRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  clockInBtn: { backgroundColor: '#10B981' },
  clockOutBtn: { backgroundColor: '#EF4444' },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 20, marginBottom: 10 },
  historyList: { marginHorizontal: 16, marginBottom: 32, gap: 8 },
  historyItem: { backgroundColor: '#111827', borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1F2937' },
  historyDate: { fontSize: 13, fontWeight: '600', color: '#D1D5DB', flex: 1 },
  historyTime: { fontSize: 11, color: '#9CA3AF', flex: 1, textAlign: 'center' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '700' },
});

const camStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  title: { color: '#fff', fontSize: 18, fontWeight: '700' },
  faceGuide: { alignItems: 'center' },
  faceCircle: { width: 220, height: 280, borderRadius: 140, borderWidth: 3, borderColor: 'rgba(59,130,246,0.8)', borderStyle: 'dashed' },
  guideText: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 12 },
  bottomBar: { alignItems: 'center', paddingBottom: 48 },
  actionLabel: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 20 },
  captureBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  captureInner: { width: 64, height: 64, borderRadius: 32 },
  timeText: { color: 'rgba(255,255,255,0.5)', fontSize: 13 },
});
