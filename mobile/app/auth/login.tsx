import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import { useAuthStore } from '@/src/stores/authStore';
import { api } from '@/src/services/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('admin@acmecorp.com');
  const [password, setPassword] = useState('Admin@123');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, deviceInfo: Platform.OS });
      if (data.data.requiresMfa) {
        Alert.alert('MFA Required', 'Please enter your authenticator code');
        return;
      }
      await login(data.data.accessToken, data.data.refreshToken, data.data.user);
      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Login Failed', err?.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to sign in',
      fallbackLabel: 'Use password',
    });
    if (result.success) {
      // Would use stored credentials in production
      Alert.alert('Biometric Auth', 'Biometric authentication successful');
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}><Text style={styles.logoIconText}>HR</Text></View>
          <Text style={styles.logoTitle}>HRMS Enterprise</Text>
          <Text style={styles.logoSub}>Your workforce, managed smarter.</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address"
            autoCapitalize="none" placeholderTextColor="#6B7280" placeholder="you@company.com" />

          <Text style={[styles.label, { marginTop: 16 }]}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword}
            secureTextEntry placeholderTextColor="#6B7280" placeholder="••••••••" />

          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Sign In</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometric}>
            <Text style={styles.biometricText}>🔐  Use Face ID / Fingerprint</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Demo: admin@acmecorp.com / Admin@123</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0F1E' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoIcon: { width: 64, height: 64, borderRadius: 18, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: '#3B82F6', shadowOpacity: 0.5, shadowRadius: 20, elevation: 8 },
  logoIconText: { color: '#fff', fontSize: 20, fontWeight: '800' },
  logoTitle: { fontSize: 26, fontWeight: '800', color: '#F9FAFB', letterSpacing: -0.5 },
  logoSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  form: { gap: 6 },
  label: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 },
  input: { height: 48, backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 16, color: '#F9FAFB', fontSize: 15, marginTop: 4 },
  loginBtn: { height: 52, backgroundColor: '#3B82F6', borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: '#3B82F6', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  biometricBtn: { height: 44, borderWidth: 1, borderColor: '#374151', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  biometricText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  hint: { textAlign: 'center', color: '#4B5563', fontSize: 11, marginTop: 32 },
});
