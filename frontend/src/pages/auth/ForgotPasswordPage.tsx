import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import { authApi } from '@/services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await authApi.forgotPassword(email); setSent(true); } catch {}
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md glass-card p-8">
        <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to login
        </Link>
        {!sent ? (
          <>
            <h2 className="font-display text-2xl font-bold mb-2">Reset password</h2>
            <p className="text-muted-foreground text-sm mb-6">Enter your email and we'll send a reset OTP.</p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full h-11 pl-10 pr-4 bg-secondary/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric/50"
                  placeholder="you@company.com" />
              </div>
              <button type="submit" disabled={loading} className="w-full btn-primary h-11">
                {loading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="font-display text-xl font-bold mb-2">Check your email</h3>
            <p className="text-muted-foreground text-sm">OTP sent to {email}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
