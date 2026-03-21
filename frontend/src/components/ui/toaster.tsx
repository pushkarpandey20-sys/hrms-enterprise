import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#111827',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#F9FAFB',
          backdropFilter: 'blur(12px)',
        },
      }}
    />
  );
}
