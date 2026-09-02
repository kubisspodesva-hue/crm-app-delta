'use client';

import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';
import { Money } from '@/components/Money';
import { api } from '@/lib/api';
import { AgentStats } from '@/types';

type SortKey = keyof AgentStats | 'name';

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'Jméno' },
  { key: 'contactedCount', label: 'Zavolaných kontaktů' },
  { key: 'meetingsCount', label: 'Schůzky' },
  { key: 'soldCount', label: 'Prodeje' },
  { key: 'rejectedCount', label: 'Odmítnutí' },
  { key: 'conversionRate', label: 'Konverze' },
  { key: 'commission', label: 'Provize' },
  { key: 'revenue', label: 'Obrat' },
];

export default function PerformancePage() {
  const [rows, setRows] = useState<AgentStats[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    api.get<AgentStats[]>('/stats/performance').then(setRows).catch(() => {});
  }, []);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: any;
      let bv: any;
      if (sortKey === 'name') {
        av = `${a.lastName ?? ''} ${a.firstName ?? ''}`;
        bv = `${b.lastName ?? ''} ${b.firstName ?? ''}`;
      } else {
        av = (a as any)[sortKey] ?? 0;
        bv = (b as any)[sortKey] ?? 0;
      }
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  return (
    <div>
      <Header title="Výkon obchodníků" />
      <div className="p-4 md:p-6">
        <div className="card overflow-auto max-h-[65vh]">
          <table className="w-full min-w-[720px] text-sm border-separate border-spacing-0">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3 cursor-pointer select-none hover:text-slate-700"
                  >
                    {col.label}
                    {sortKey === col.key && (sortDir === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((row) => (
                <tr key={row.userId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {row.firstName} {row.lastName}
                    {row.careerLevel && (
                      <div className="text-xs font-normal text-slate-500">
                        {row.careerLevelEmoji} {row.careerLevel}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{row.contactedCount}</td>
                  <td className="px-4 py-3">{row.meetingsCount}</td>
                  <td className="px-4 py-3">{row.soldCount}</td>
                  <td className="px-4 py-3">{row.rejectedCount}</td>
                  <td className="px-4 py-3">{row.conversionRate}%</td>
                  <td className="px-4 py-3">
                    <Money value={row.commission} />
                  </td>
                  <td className="px-4 py-3">
                    <Money value={row.revenue} />
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-8 text-slate-500">
                    Zatím žádná data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
