'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Lead } from '@/types';

interface LeadsSearchResponse {
  items: Lead[];
  total: number;
}

/**
 * Rychlé vyhledávání kontaktů dostupné odkudkoliv v appce (lupa v horní liště).
 * Hledá napříč jménem, telefonem, emailem i firmou (backend /leads?search=...
 * dělá case-insensitive "contains" na všech těchto polích), takže stačí zadat
 * třeba jen první tři číslice telefonu nebo část jména/firmy.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
      // Klávesová zkratka "/" otevře vyhledávání odkudkoliv (mimo psaní do jiného pole)
      if (
        e.key === '/' &&
        !open &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      params.set('search', trimmed);
      params.set('page', '1');
      params.set('pageSize', '8');
      api
        .get<LeadsSearchResponse>(`/leads?${params.toString()}`)
        .then((res) => {
          setResults(res.items);
          setTotal(res.total);
        })
        .catch(() => {
          setResults([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  function reset() {
    setOpen(false);
    setQuery('');
    setResults([]);
    setTotal(0);
  }

  function goToLead(id: string) {
    reset();
    router.push(`/leads/${id}`);
  }

  function goToFullList() {
    const q = query.trim();
    reset();
    router.push(`/leads?search=${encodeURIComponent(q)}`);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-slate-300 hover:text-ink text-lg leading-none px-1.5 py-1"
        aria-label="Hledat kontakt"
        title="Hledat kontakt — jméno, telefon, email nebo firma (zkratka: /)"
      >
        🔍
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 card p-0 shadow-lg z-50 overflow-hidden">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && total > 0) goToFullList();
            }}
            placeholder="Jméno, telefon, email, firma…"
            className="w-full bg-surface-card text-ink placeholder:text-muted px-4 py-3 text-sm focus:outline-none border-b border-hairline"
          />
          <div className="max-h-80 overflow-auto">
            {loading && <p className="px-4 py-3 text-sm text-muted">Hledám…</p>}
            {!loading && query.trim() && results.length === 0 && (
              <p className="px-4 py-3 text-sm text-muted">Nic nenalezeno</p>
            )}
            {!loading &&
              results.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => goToLead(lead.id)}
                  className="w-full text-left px-4 py-2.5 hover:bg-surface-elevated border-b border-hairline last:border-0 transition-colors"
                >
                  <div className="text-sm font-medium text-ink truncate">
                    {lead.firstName} {lead.lastName}
                  </div>
                  <div className="text-xs text-muted truncate">
                    {lead.phone} · {lead.company || lead.email}
                  </div>
                </button>
              ))}
            {!loading && total > results.length && (
              <button
                onClick={goToFullList}
                className="w-full text-left px-4 py-2.5 text-xs font-semibold text-brand-500 hover:bg-surface-elevated transition-colors"
              >
                Zobrazit všech {total} výsledků →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
