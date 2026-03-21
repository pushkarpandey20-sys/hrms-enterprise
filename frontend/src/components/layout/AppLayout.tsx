import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import OfflineBanner from '../pwa/OfflineBanner';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

export default function AppLayout() {
  const { sidebarCollapsed } = useUIStore();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <OfflineBanner />
      <Sidebar />
      <div className={cn('flex flex-col flex-1 min-w-0 transition-all duration-300', sidebarCollapsed ? 'ml-16' : 'ml-64')}>
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          <motion.div
            key={window.location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="max-w-screen-2xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </main>
      </div>
    </div>
  );
}
