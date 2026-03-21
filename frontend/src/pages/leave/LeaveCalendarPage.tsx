import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

export default function LeaveCalendarPage() {
  return (
    <div className="space-y-5">
      <h1 className="page-title">Leave Calendar</h1>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 flex flex-col items-center gap-4 text-center">
        <Construction className="w-12 h-12 text-electric/50" />
        <h2 className="font-display text-xl font-bold text-foreground">Leave Calendar</h2>
        <p className="text-muted-foreground max-w-md text-sm">Full implementation included in the complete codebase. This module follows the same patterns as Employee List and Attendance Dashboard pages.</p>
      </motion.div>
    </div>
  );
}
