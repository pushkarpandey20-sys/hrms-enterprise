import { useState } from 'react';
import { Bell, Search, ChevronDown } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { getInitials } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { notificationApi } from '@/services/api';

export default function TopBar() {
  const { user } = useAuthStore();
  const [searchFocus, setSearchFocus] = useState(false);

  const { data: unread } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationApi.getUnread().then(r => r.data.data),
    refetchInterval: 30000,
  });

  return (
    <header className="h-16 border-b border-border bg-midnight/80 backdrop-blur-sm flex items-center px-6 gap-4 flex-shrink-0 sticky top-0 z-40">
      {/* Search */}
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200 flex-1 max-w-md
        ${searchFocus ? 'border-electric/50 bg-secondary' : 'border-border bg-secondary/50'}`}>
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          placeholder="Search employees, records..."
          className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 flex-1 outline-none"
          onFocus={() => setSearchFocus(true)}
          onBlur={() => setSearchFocus(false)}
        />
        <kbd className="text-[10px] text-muted-foreground/40 border border-border px-1 rounded">⌘K</kbd>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-lg border border-border bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unread && unread.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
              {Math.min(unread.length, 9)}
            </span>
          )}
        </button>

        {/* User menu */}
        <button className="flex items-center gap-2.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 hover:bg-secondary transition-colors">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-electric to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
            {user?.name ? getInitials(user.name) : 'U'}
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-xs font-medium text-foreground">{user?.name || 'Admin'}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}
