import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/src/stores/authStore';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); router.replace('/auth/login'); } },
    ]);
  };

  const menuItems = [
    { icon: 'person-outline', label: 'My Profile', onPress: () => {} },
    { icon: 'document-text-outline', label: 'My Documents', onPress: () => {} },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => {} },
    { icon: 'shield-checkmark-outline', label: 'Change Password', onPress: () => {} },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}><Text style={styles.avatarText}>👤</Text></View>
        <Text style={styles.name}>{user?.role?.replace('_', ' ')}</Text>
        <Text style={styles.role}>Employee ID: {user?.employeeId?.slice(0, 8) || '--'}</Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        {menuItems.map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIcon}><Ionicons name={icon as any} size={20} color="#3B82F6" /></View>
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color="#4B5563" />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  profileHeader: { alignItems: 'center', paddingTop: 70, paddingBottom: 32 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3, borderColor: '#3B82F6' },
  avatarText: { fontSize: 36 },
  name: { fontSize: 20, fontWeight: '800', color: '#F9FAFB', textTransform: 'capitalize' },
  role: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  menu: { marginHorizontal: 16, backgroundColor: '#111827', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#1F2937', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937', gap: 12 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#1E3A5F', alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 15, color: '#D1D5DB', fontWeight: '500' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 16, marginBottom: 40, backgroundColor: '#EF444420', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#EF444430' },
  logoutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },
});
