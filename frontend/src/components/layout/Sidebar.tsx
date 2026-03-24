import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Clock, Calendar, CreditCard, Package,
  BarChart3, Settings, LogOut, ChevronLeft, ChevronRight,
  Building2, TreePine, Shield, Wrench, Target, HelpCircle,
  FileText, Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/services/api';

type NavItem = { to: string; icon: any; label: string; roles?: string[] };
type NavGroup = { label: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/employees', icon: Users, label: 'Employees', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { to: '/employees/org-chart', icon: TreePine, label: 'Org Chart' },
    ],
  },
  {
    label: 'Time & Leave',
    items: [
      { to: '/attendance', icon: Clock, label: 'Attendance', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { to: '/attendance/my', icon: Clock, label: 'My Attendance', roles: ['EMPLOYEE'] },
      { to: '/leave', icon: Calendar, label: 'Leave', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { to: '/leave/my', icon: Calendar, label: 'My Leaves', roles: ['EMPLOYEE'] },
      { to: '/attendance/hotspots', icon: Wifi, label: 'Hotspots', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
    ],
  },
  {
    label: 'Finance',
    items: [
      { to: '/payroll', icon: CreditCard, label: 'Payroll', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
      { to: '/payroll/my-payslips', icon: FileText, label: 'My Payslips', roles: ['EMPLOYEE', 'MANAGER'] },
      { to: '/assets', icon: Package, label: 'Assets', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/reports', icon: BarChart3, label: 'Reports', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
    ],
  },
  {
    label: 'Enterprise',
    items: [
      { to: '/rbac', icon: Shield, label: 'Access Control', roles: ['SUPER_ADMIN'] },
      { to: '/repair', icon: Wrench, label: 'Asset Repair', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
      { to: '/performance', icon: Target, label: 'Performance', roles: ['SUPER_ADMIN', 'HR_ADMIN', 'MANAGER'] },
      { to: '/helpdesk', icon: HelpCircle, label: 'Helpdesk' },
      { to: '/offboarding', icon: LogOut, label: 'Offboarding', roles: ['SUPER_ADMIN', 'HR_ADMIN'] },
    ],
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout, refreshToken } = useAuthStore() as any;
  const navigate = useNavigate();
  const role: string = user?.role || 'EMPLOYEE';

  const handleLogout = async () => {
    try { await authApi.logout(refreshToken); } catch {}
    logout();
    navigate('/login');
  };

  const isVisible = (item: NavItem) => {
    if (!item.roles || item.roles.length === 0) return true;
    return item.roles.includes(role);
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarCollapsed ? 64 : 256 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="fixed left-0 top-0 h-full z-50 flex flex-col bg-midnight border-r border-border overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-border flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="ml-3 overflow-hidden"
            >
              <p className="font-display font-bold text-foreground text-lg leading-tight">Wheeley</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">HRMS</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
        {navGroups.map((group) => {
          const visibleItems = group.items.filter(isVisible);
          if (visibleItems.length === 0) return null;
          return (
            <div key={group.label}>
              {!sidebarCollapsed && (
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground/60 px-3 mb-1">{group.label}</p>
              )}
              <ul className="space-y-0.5">
                {visibleItems.map(({ to, icon: Icon, label }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={to === '/attendance' || to === '/leave'}
                      className={({ isActive }) =>
                        cn('sidebar-link', isActive && 'active', sidebarCollapsed && 'justify-center px-0 py-2.5')
                      }
                      title={sidebarCollapsed ? label : undefined}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && <span>{label}</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-border p-2 space-y-0.5 flex-shrink-0">
        <NavLink to="/settings" className={({ isActive }) => cn('sidebar-link', isActive && 'active', sidebarCollapsed && 'justify-center')}>
          <Settings className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Settings</span>}
        </NavLink>
        <button onClick={handleLogout} className={cn('sidebar-link w-full hover:text-red-400', sidebarCollapsed && 'justify-center')}>
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-midnight border border-border flex items-center justify-center hover:bg-secondary transition-colors z-50"
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
