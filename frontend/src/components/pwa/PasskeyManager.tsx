import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Key, CheckCircle2, AlertCircle, Fingerprint, Shield } from 'lucide-react';
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerPasskey,
  subscribeToPushNotifications,
} from '../../lib/webauthn';

export default function PasskeyManager() {
  const [supported, setSupported] = useState(false);
  const [platformAvailable, setPlatformAvailable] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    setSupported(isWebAuthnSupported());
    isPlatformAuthenticatorAvailable().then(setPlatformAvailable);
    setPushSubscribed('Notification' in window && Notification.permission === 'granted');
  }, []);

  const handleRegisterPasskey = async () => {
    setRegistering(true);
    setResult(null);
    try {
      const res = await registerPasskey();
      setResult({
        success: res.success,
        message: res.success
          ? 'Passkey registered successfully! You can now sign in with biometrics.'
          : res.error ?? 'Registration failed',
      });
    } finally {
      setRegistering(false);
    }
  };

  const handleEnablePush = async () => {
    const success = await subscribeToPushNotifications();
    setPushSubscribed(success);
    setResult({
      success,
      message: success
        ? 'Push notifications enabled'
        : 'Could not enable push notifications',
    });
  };

  if (!supported) {
    return (
      <div className="glass-card rounded-xl p-4 flex items-center gap-3 text-white/40">
        <AlertCircle className="w-5 h-5" />
        <p className="text-sm">WebAuthn is not supported in this browser</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Passkey Registration */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center">
              <Fingerprint className="w-5 h-5 text-electric" />
            </div>
            <div>
              <p className="text-white/90 text-sm font-medium">Passkey Sign-in</p>
              <p className="text-white/40 text-xs">
                {platformAvailable ? 'Face ID / Touch ID available' : 'Security key required'}
              </p>
            </div>
          </div>
          <button
            onClick={handleRegisterPasskey}
            disabled={registering}
            className="btn-primary text-xs px-3 py-1.5 disabled:opacity-50"
          >
            {registering ? 'Registering...' : 'Register Passkey'}
          </button>
        </div>
      </div>

      {/* Push Notifications */}
      <div className="glass-card rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-gold" />
            </div>
            <div>
              <p className="text-white/90 text-sm font-medium">Push Notifications</p>
              <p className="text-white/40 text-xs">
                {pushSubscribed ? 'Enabled' : 'Get alerts for leave, payroll, tickets'}
              </p>
            </div>
          </div>
          {pushSubscribed ? (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle2 className="w-4 h-4" />
              Active
            </div>
          ) : (
            <button
              onClick={handleEnablePush}
              className="text-xs px-3 py-1.5 rounded-lg border border-gold/30 text-gold hover:bg-gold/10 transition-colors"
            >
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Result feedback */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`rounded-xl p-3 flex items-center gap-2 text-sm ${
            result.success
              ? 'bg-green-500/10 border border-green-500/20 text-green-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {result.success
            ? <CheckCircle2 className="w-4 h-4 shrink-0" />
            : <AlertCircle className="w-4 h-4 shrink-0" />
          }
          {result.message}
        </motion.div>
      )}
    </div>
  );
}
