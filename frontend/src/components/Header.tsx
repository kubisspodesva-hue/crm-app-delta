'use client';

import { useAuth } from '@/lib/auth-context';
import { useMobileNav } from '@/lib/mobile-nav-context';
import { NotificationBell } from './NotificationBell';
import { GlobalSearch } from './GlobalSearch';

export function Header({ title }: { title: string }) {
  const { logout } = useAuth();
  const { toggle } = useMobileNav();

  return (
    <header className="sticky top-0 z-30">
      <div className="pipeline-stripe" />
      <div className="h-16 border-b border-hairline bg-surface-soft flex items-center justify-between px-4 md:px-6 gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={toggle}
            className="md:hidden text-slate-300 hover:text-white text-xl leading-none px-1 shrink-0"
            aria-label="Otevřít menu"
          >
            ☰
          </button>
          <h1 className="text-base md:text-lg font-bold tracking-tight text-white truncate">{title}</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <GlobalSearch />
          <NotificationBell />
          <button onClick={() => logout()} className="btn-secondary text-sm px-2.5 md:px-4">
            <span className="hidden sm:inline">Odhlásit se</span>
            <span className="sm:hidden">⏻</span>
          </button>
        </div>
      </div>
    </header>
  );
}
