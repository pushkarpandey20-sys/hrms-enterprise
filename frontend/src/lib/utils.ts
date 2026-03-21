import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(date: string | Date, fmt = 'dd MMM yyyy'): string {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  if (fmt === 'dd MMM yyyy') return `${day} ${month} ${year}`;
  return d.toLocaleDateString();
}

export function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

export const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  INACTIVE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  PROBATION: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  TERMINATED: 'bg-red-500/20 text-red-400 border-red-500/30',
  RESIGNED: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
  DRAFT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PROCESSED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  PAID: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PRESENT: 'bg-emerald-500/20 text-emerald-400',
  ABSENT: 'bg-red-500/20 text-red-400',
  ON_LEAVE: 'bg-blue-500/20 text-blue-400',
  LATE: 'bg-orange-500/20 text-orange-400',
};
