import { motion } from 'framer-motion';
import { Settings, Fingerprint, Bell, Shield, Palette, Globe } from 'lucide-react';
import PasskeyManager from '../../components/pwa/PasskeyManager';

type SettingsSection = {
  id: string;
  icon: any;
  label: string;
  description: string;
  content: React.ReactNode;
};

export default function SettingsPage() {
  const sections: SettingsSection[] = [
    {
      id: 'security',
      icon: Fingerprint,
      label: 'Security & Passkeys',
      description: 'Manage passwordless sign-in and push notifications',
      content: <PasskeyManager />,
    },
    {
      id: 'notifications',
      icon: Bell,
      label: 'Notifications',
      description: 'Configure email, push, and in-app alerts',
      content: <NotificationSettings />,
    },
    {
      id: 'appearance',
      icon: Palette,
      label: 'Appearance',
      description: 'Theme and display preferences',
      content: <AppearanceSettings />,
    },
    {
      id: 'account',
      icon: Shield,
      label: 'Account',
      description: 'Profile, password, and 2FA settings',
      content: <AccountSettings />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="text-white/50 text-sm mt-1">Manage your account and application preferences</p>
        </div>
        <Settings className="w-8 h-8 text-electric/70" />
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <motion.div
            key={section.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-electric/10 flex items-center justify-center shrink-0">
                <section.icon className="w-5 h-5 text-electric" />
              </div>
              <div>
                <h2 className="text-white/90 font-semibold text-sm">{section.label}</h2>
                <p className="text-white/40 text-xs">{section.description}</p>
              </div>
            </div>
            <div className="p-6">
              {section.content}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function NotificationSettings() {
  const notifications = [
    { label: 'Leave request updates', description: 'When your leave is approved or rejected' },
    { label: 'Payslip available', description: 'Monthly payslip generation notifications' },
    { label: 'Helpdesk ticket updates', description: 'Status changes on your tickets' },
    { label: 'Attendance reminders', description: 'Daily clock-in reminders' },
    { label: 'Performance review deadlines', description: 'Upcoming review submission deadlines' },
  ];

  return (
    <div className="space-y-3">
      {notifications.map(({ label, description }) => (
        <div key={label} className="flex items-center justify-between py-2">
          <div>
            <p className="text-white/80 text-sm">{label}</p>
            <p className="text-white/40 text-xs">{description}</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" defaultChecked className="sr-only peer" />
            <div className="w-10 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/60 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-electric" />
          </label>
        </div>
      ))}
    </div>
  );
}

function AppearanceSettings() {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-white/70 text-sm font-medium mb-3">Theme</p>
        <div className="flex gap-3">
          {[
            { id: 'dark', label: 'Dark', bg: '#0A0F1E', active: true },
            { id: 'midnight', label: 'Midnight', bg: '#030712' },
            { id: 'ocean', label: 'Ocean', bg: '#0c1a2e' },
          ].map(theme => (
            <button
              key={theme.id}
              className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                theme.active
                  ? 'border-electric bg-electric/10'
                  : 'border-white/[0.06] bg-white/[0.02] hover:border-white/20'
              }`}
            >
              <div className="w-12 h-8 rounded-lg" style={{ background: theme.bg }} />
              <span className="text-xs text-white/60">{theme.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-white/70 text-sm font-medium mb-3">Accent Color</p>
        <div className="flex gap-2">
          {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map(color => (
            <button
              key={color}
              className="w-8 h-8 rounded-full ring-2 ring-offset-2 ring-offset-midnight transition-all hover:scale-110"
              style={{ background: color } as React.CSSProperties}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AccountSettings() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/40 block mb-1.5">Display Name</label>
          <input
            placeholder="Your name"
            className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-4 py-2.5 text-white placeholder-white/30 focus:outline-none focus:border-electric/50 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 block mb-1.5">Language</label>
          <select className="w-full bg-white/[0.06] border border-white/[0.10] rounded-xl px-3 py-2.5 text-white focus:outline-none text-sm">
            <option>English (US)</option>
            <option>English (UK)</option>
            <option>Hindi</option>
          </select>
        </div>
      </div>

      <div>
        <p className="text-white/70 text-sm font-medium mb-2">Two-Factor Authentication</p>
        <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div>
            <p className="text-white/80 text-sm">Authenticator App (TOTP)</p>
            <p className="text-white/40 text-xs">Secure your account with an authenticator app</p>
          </div>
          <button className="text-xs px-3 py-1.5 rounded-lg bg-electric/10 text-electric border border-electric/20 hover:bg-electric/20 transition-colors">
            Configure
          </button>
        </div>
      </div>

      <button className="w-full py-2.5 rounded-xl bg-electric text-white text-sm font-medium hover:bg-electric/90 transition-colors shadow-glow">
        Save Changes
      </button>
    </div>
  );
}
