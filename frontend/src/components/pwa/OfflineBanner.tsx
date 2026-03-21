import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { getQueuedCount, initOfflineSync, syncQueuedRecords } from '../../lib/offlineAttendanceQueue';
import { attendanceApi } from '../../services/api';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedCount, setQueuedCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<{ synced: number; failed: number } | null>(null);

  useEffect(() => {
    const update = async () => {
      const count = await getQueuedCount();
      setQueuedCount(count);
    };
    update();

    const handleOnline = () => {
      setIsOnline(true);
      update();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Init auto-sync
    const cleanup = initOfflineSync(
      async (record) => {
        if (record.type === 'clock_in') {
          await attendanceApi.clockIn(record.data);
        } else {
          await attendanceApi.clockOut(record.data);
        }
      },
      (result) => {
        setLastSync(result);
        setQueuedCount(0);
        setTimeout(() => setLastSync(null), 5000);
      },
    );

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      cleanup();
    };
  }, []);

  const manualSync = async () => {
    setSyncing(true);
    try {
      const result = await syncQueuedRecords(async (record) => {
        if (record.type === 'clock_in') {
          await attendanceApi.clockIn(record.data);
        } else {
          await attendanceApi.clockOut(record.data);
        }
      });
      setLastSync(result);
      const count = await getQueuedCount();
      setQueuedCount(count);
    } finally {
      setSyncing(false);
    }
  };

  const showBanner = !isOnline || queuedCount > 0 || lastSync !== null;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2 text-xs font-medium ${
            !isOnline
              ? 'bg-red-500/90 text-white'
              : lastSync?.failed
              ? 'bg-orange-500/90 text-white'
              : lastSync?.synced
              ? 'bg-green-500/90 text-white'
              : 'bg-yellow-500/90 text-black'
          }`}
        >
          <div className="flex items-center gap-2">
            {!isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>You're offline — attendance will be queued</span>
              </>
            ) : lastSync ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span>
                  Synced {lastSync.synced} record{lastSync.synced !== 1 ? 's' : ''}
                  {lastSync.failed > 0 ? ` · ${lastSync.failed} failed` : ''}
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{queuedCount} offline record{queuedCount !== 1 ? 's' : ''} pending sync</span>
              </>
            )}
          </div>

          {isOnline && queuedCount > 0 && (
            <button
              onClick={manualSync}
              disabled={syncing}
              className="flex items-center gap-1 px-2 py-1 rounded bg-black/20 hover:bg-black/30 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
