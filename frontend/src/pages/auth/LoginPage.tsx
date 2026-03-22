import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Building2, Lock, Mail, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@wheeley.in');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await authApi.login(email, password);
      if (data.data.requiresMfa) {
        setMfaToken(data.data.mfaToken);
        setMfaRequired(true);
      } else {
        login(data.data.accessToken, data.data.refreshToken, data.data.user);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-navy overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-[#0D1829] to-[#0A1628]" />
        <div className="absolute inset-0">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full mix-blend-overlay"
              style={{
                width: `${200 + i * 80}px`,
                height: `${200 + i * 80}px`,
                background: i % 2 === 0 ? 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
                left: `${10 + i * 15}%`,
                top: `${5 + i * 13}%`,
              }}
              animate={{ x: [0, 20, -10, 0], y: [0, -15, 10, 0] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}
        </div>
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(59,130,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.5) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div className="relative z-10 flex flex-col justify-center px-16">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center shadow-glow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-bold text-white">Wheeley HRMS</h1>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">Enterprise Platform</p>
              </div>
            </div>
            <h2 className="font-display text-5xl font-bold text-white leading-tight mb-4">
              Manage your<br /><span className="gradient-text">workforce</span><br />effortlessly.
            </h2>
            <p className="text-muted-foreground text-lg max-w-md">Attendance, payroll, leave, assets — all in one powerful platform built for modern enterprises.</p>
            <div className="flex flex-wrap gap-2 mt-8">
              {['GPS Attendance', 'Smart Payroll', 'Leave Management', 'Asset Tracking', 'Analytics'].map(f => (
                <span key={f} className="glass-card px-3 py-1.5 text-xs text-electric font-medium rounded-full">{f}</span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center shadow-glow">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-display text-xl font-bold">Wheeley HRMS</h1>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-3xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account to continue</p>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </motion.div>
          )}

          {!mfaRequired ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email</label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    className="w-full h-11 pl-10 pr-4 bg-secondary/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-electric/50 focus:border-electric/50 transition-colors"
                    placeholder="you@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Password</label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required
                    className="w-full h-11 pl-10 pr-12 bg-secondary/50 border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-electric/50 focus:border-electric/50 transition-colors"
                    placeholder="••••••••" 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="rounded" />
                  Remember me
                </label>
                <Link to="/forgot-password" className="text-electric hover:text-electric-light transition-colors">Forgot password?</Link>
              </div>
              <button type="submit" disabled={loading}
                className="w-full btn-primary h-11 flex items-center justify-center gap-2 mt-2">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-muted-foreground text-sm">Enter the 6-digit code from your authenticator app</p>
              <input
                type="text" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value)}
                className="w-full h-14 text-center text-2xl tracking-widest font-bold bg-secondary/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-electric/50"
                placeholder="000000"
              />
              <button className="w-full btn-primary h-11">Verify</button>
            </div>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground/60">
            Demo credentials: admin@wheeley.in / Admin@123
          </p>
        </motion.div>
      </div>
    </div>
  );
}
