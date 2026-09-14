'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useAuth } from '@/lib/auth-context';
import { useMobileNav } from '@/lib/mobile-nav-context';
import { api } from '@/lib/api';

const AGENT_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/leads', label: 'Leady', icon: '🧾' },
  { href: '/leaderboard', label: 'Žebříček', icon: '🏆' },
  { href: '/targets', label: 'Cíle a predikce', icon: '🎯' },
  { href: '/commissions', label: 'Provize', icon: '💰' },
];

const ADMIN_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/leads', label: 'Leady', icon: '🧾' },
  { href: '/leaderboard', label: 'Žebříček', icon: '🏆' },
  { href: '/performance', label: 'Výkon týmu', icon: '📈' },
  { href: '/agents', label: 'Obchodníci', icon: '👥' },
  { href: '/targets', label: 'Cíle a predikce', icon: '🎯' },
  { href: '/commissions', label: 'Provize', icon: '💰' },
  { href: '/settings', label: 'Nastavení', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { isOpen, close } = useMobileNav();
  const links = user?.role === 'ADMIN' ? ADMIN_LINKS : AGENT_LINKS;
  const [careerLevel, setCareerLevel] = useState<{ title: string; emoji: string } | null>(null);

  useEffect(() => {
    if (user?.role === 'AGENT') {
      api
        .get<{ careerLevel: string; careerLevelEmoji: string }>('/stats/dashboard')
        .then((d) => setCareerLevel({ title: d.careerLevel, emoji: d.careerLevelEmoji }))
        .catch(() => {});
    }
  }, [user]);

  return (
    <>
      {/* Backdrop - jen na mobilu, když je menu vysunuté */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside
        className={clsx(
          'w-64 shrink-0 bg-canvas flex flex-col',
          'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
          'md:sticky md:top-0 md:h-screen md:translate-x-0 md:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-none bg-brand-600 text-white flex items-center justify-center font-bold mr-2">
                D
              </div>
              <span className="font-semibold text-ink tracking-tight">CRM Delta</span>
            </div>
            <button
              onClick={close}
              className="md:hidden text-slate-400 hover:text-ink text-xl leading-none px-2"
              aria-label="Zavřít menu"
            >
              ✕
            </button>
          </div>
          <div className="pipeline-stripe mt-4" />
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {links.map((link) => {
            const active = pathname === link.href || pathname.startsWith(link.href + '/');
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={clsx(
                  'flex items-center gap-3 rounded-none border-l-2 px-3 py-2.5 text-[13px] font-medium tracking-wide transition-colors',
                  active
                    ? 'border-brand-500 bg-surface-elevated text-ink'
                    : 'border-transparent text-slate-600 hover:bg-surface-elevated hover:text-ink',
                )}
              >
                <span>{link.icon}</span>
                {link.label}
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="p-4 border-t border-hairline text-sm">
            <p className="font-semibold text-ink">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs uppercase tracking-wide text-muted mt-0.5">
              {user.role === 'ADMIN' ? 'Administrátor' : 'Obchodník'}
            </p>
            {careerLevel && (
              <p className="text-xs text-slate-500 mt-0.5">
                {careerLevel.emoji} {careerLevel.title}
              </p>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
