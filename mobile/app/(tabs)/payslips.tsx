import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/src/services/api';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

export default function PayslipsScreen() {
  const { data } = useQuery({ queryKey: ['my-payslips'], queryFn: () => api.get('/payroll/my-payslips').then(r => r.data.data) });

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const handleDownload = async (id: string, month: number, year: number) => {
    try {
      const res = await api.get(`/payroll/payslip/${id}/download`, { responseType: 'arraybuffer' });
      const base64 = Buffer.from(res.data).toString('base64');
      const path = `${FileSystem.cacheDirectory}payslip-${year}-${month}.pdf`;
      await FileSystem.writeAsStringAsync(path, base64, { encoding: FileSystem.EncodingType.Base64 });
      await Sharing.shareAsync(path, { mimeType: 'application/pdf' });
    } catch { Alert.alert('Error', 'Failed to download payslip'); }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>My Payslips</Text>
      <View style={styles.list}>
        {data?.map((p: any) => (
          <View key={p.id} style={styles.card}>
            <View>
              <Text style={styles.period}>{months[p.month - 1]} {p.year}</Text>
              <Text style={styles.days}>{p.presentDays} working days</Text>
            </View>
            <View style={styles.amounts}>
              <Text style={styles.net}>₹{p.netPay.toLocaleString()}</Text>
              <Text style={styles.gross}>Gross: ₹{p.grossEarnings.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={styles.dlBtn} onPress={() => handleDownload(p.id, p.month, p.year)}>
              <Ionicons name="download-outline" size={20} color="#3B82F6" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E', paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#F9FAFB', marginHorizontal: 20, marginBottom: 20 },
  list: { paddingHorizontal: 16, gap: 10, paddingBottom: 32 },
  card: { backgroundColor: '#111827', borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#1F2937' },
  period: { fontSize: 15, fontWeight: '700', color: '#F9FAFB' },
  days: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  amounts: { flex: 1, paddingHorizontal: 12 },
  net: { fontSize: 17, fontWeight: '800', color: '#10B981', textAlign: 'right' },
  gross: { fontSize: 11, color: '#6B7280', textAlign: 'right' },
  dlBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
});
