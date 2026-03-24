import { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Camera, MapPin, Wifi, CheckCircle, XCircle, AlertCircle,
  LogIn, LogOut, X, RefreshCw, Loader2,
} from 'lucide-react';
import { attendanceApi } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
== undefined && (
                  <div>
                    <p className="text-muted-foreground text-xs">Face Verified</p>
                    <p className={`font-semibold ${todayRecord.isFaceVerified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {todayRecord.isFaceVerified ? 'Yes' : 'No'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Clock-in/out Buttons */}
        <div className="glass-card p-5 col-span-1 flex flex-col justify-center gap-3">
          <Button
            onClick={() => startCamera('in')}
            disabled={!!todayRecord?.clockIn || isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
          >
            <LogIn className="w-4 h-4" />
            {todayRecord?.clockIn ? `Clocked In at ${formatTime(todayRecord.clockIn)}` : 'Clock In'}
          </Button>
          <Button
            onClick={() => startCamera('out')}
            disabled={!todayRecord?.clockIn || !!todayRecord?.clockOut || isLoading}
            variant="outline"
            className="w-full gap-2"
          >
            <LogOut className="w-4 h-4" />
            {todayRecord?.clockOut ? `Clocked Out at ${formatTime(todayRecord.clockOut)}` : 'Clock Out'}
          </Button>
        </div>

        {/* Live Clock */}
        <div className="glass-card p-5 col-span-1 flex flex-col items-center justify-center">
          <Clock className="w-8 h-8 text-electric mb-2" />
          <LiveClock />
          <p className="text-xs text-muted-foreground mt-1">IST</p>
        </div>
      </div>

      {/* Attendance History */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-sm">Last 30 Days</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/20">
                {['Date', 'Clock In', 'Clock Out', 'Hours', 'Status', 'Location', 'Face'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">No attendance records</td></tr>
              ) : history.map((rec: any, i: number) => (
                <motion.tr key={rec.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                  className="border-b border-border/40 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{formatDate(rec.date)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatTime(rec.clockIn)}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{formatTime(rec.clockOut)}</td>
                  <td className="px-4 py-2.5">{calcHours(rec.workingMins)}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-${statusColors[rec.status] || 'gray'}-500/10 text-${statusColors[rec.status] || 'gray'}-400`}>
                      {rec.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {rec.clockInLat ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <MapPin className="w-3 h-3" />GPS
                      </span>
                    ) : rec.clockInWifiSsid ? (
                      <span className="flex items-center gap-1 text-xs text-blue-400">
                        <Wifi className="w-3 h-3" />{rec.clockInWifiSsid}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    {rec.isFaceVerified === true ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : rec.isFaceVerified === false ? (
                      <XCircle className="w-4 h-4 text-red-400" />
                    ) : '—'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-midnight border border-border rounded-xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="font-semibold text-sm">
                  {clockType === 'in' ? '🟢 Clock In' : '🔴 Clock Out'}
                </h3>
                <button onClick={closeCamera} className="text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Camera / Photo */}
                <div className="relative rounded-lg overflow-hidden bg-secondary/40 aspect-[4/3]">
                  {capturedPhoto ? (
                    <img src={capturedPhoto} alt="selfie" className="w-full h-full object-cover" />
                  ) : cameraError ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <Camera className="w-10 h-10 opacity-40" />
                      <p className="text-xs text-center px-4">{cameraError}</p>
                    </div>
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                  )}
                  <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* GPS Status */}
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className={`w-4 h-4 ${gpsLoading ? 'text-yellow-400 animate-pulse' : gpsLocation ? 'text-emerald-400' : 'text-red-400'}`} />
                  {gpsLoading ? (
                    <span className="text-yellow-400">Getting location...</span>
                  ) : gpsLocation ? (
                    <span className="text-emerald-400">
                      Location: {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)} (±{Math.round(gpsLocation.accuracy)}m)
                    </span>
                  ) : (
                    <span className="text-red-400">{gpsError || 'Location unavailable'}</span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  {!capturedPhoto && !cameraError && (
                    <Button onClick={capturePhoto} className="flex-1 gap-2">
                      <Camera className="w-4 h-4" /> Take Photo
                    </Button>
                  )}
                  {capturedPhoto && (
                    <Button variant="outline" onClick={retakePhoto} className="gap-2">
                      <RefreshCw className="w-4 h-4" /> Retake
                    </Button>
                  )}
                  <Button
                    onClick={submitAttendance}
                    disabled={isBusy || (!capturedPhoto && !cameraError)}
                    className={`flex-1 gap-2 ${clockType === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white`}
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : clockType === 'in' ? <LogIn className="w-4 h-4" /> : <LogOut className="w-4 h-4" />}
                    {isBusy ? 'Processing...' : clockType === 'in' ? 'Confirm Clock In' : 'Confirm Clock Out'}
                  </Button>
                </div>

                {cameraError && (
                  <Button
                    onClick={submitAttendance}
                    disabled={isBusy}
                    className={`w-full gap-2 ${clockType === 'in' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white`}
                  >
                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                    {isBusy ? 'Processing...' : `${clockType === 'in' ? 'Clock In' : 'Clock Out'} Without Photo`}
                  </Button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="font-display text-2xl font-bold tabular-nums">
      {time.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </p>
  );
}
