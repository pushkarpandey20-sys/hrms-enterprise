import { cn, STATUS_COLORS } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: string;
  className?: string;
}

export function Badge({ children, variant, className }: BadgeProps) {
  const colorClass = variant ? STATUS_COLORS[variant] || 'bg-gray-500/20 text-gray-400' : 'bg-gray-500/20 text-gray-400';
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border', colorClass, className)}>
      {children}
    </span>
  );
}
