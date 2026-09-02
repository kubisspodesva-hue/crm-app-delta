'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { Notification } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const data = await api.get<Notification[]>('/notifications');
      setNotifications(data);
    } catch {
      // tichý fail - notifikace nejsou kritické
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  async function markAllRead() {
    await api.patch('/notifications/read-all');
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-none p-2 hover:bg-surface-elevated transition-colors"
        aria-label="Notifikace"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-2 right-2 top-16 md:absolute md:left-auto md:right-0 md:top-auto md:mt-2 md:w-80 card p-2 z-50 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-sm font-semibold">Notifikace</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-brand-600 hover:underline">
                Označit vše jako přečtené
              </button>
            )}
          </div>
          {notifications.length === 0 && (
            <p className="text-sm text-slate-500 px-2 py-4 text-center">Žádné notifikace</p>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`px-2 py-2 rounded-none text-sm ${n.isRead ? '' : 'bg-brand-50'}`}
            >
              <p className="font-medium text-slate-800">{n.title}</p>
              <p className="text-slate-600">{n.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: cs })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
