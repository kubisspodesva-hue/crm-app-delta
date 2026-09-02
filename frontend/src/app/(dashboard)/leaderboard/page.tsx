'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import { Money } from '@/components/Money';
import { api } from '@/lib/api';
import { LeaderboardEntry } from '@/types';
import { useAuth } from '@/lib/auth-context';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    api.get<LeaderboardEntry[]>('/stats/leaderboard').then(setRows).catch(() => {});
  }, []);

  return (
    <div>
      <Header title="Žebříček obchodníků" />
      <div className="p-4 md:p-6 space-y-4">
        <p className="text-sm text-slate-500">
          Aktuální pořadí podle obratu. Provize a mzdové údaje tu nejsou vidět - jde jen o to,
          kdo aktuálně vede.
        </p>

        <div className="card overflow-auto max-h-[70vh]">
          <table className="w-full min-w-[640px] text-sm border-separate border-spacing-0">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3 w-14">#</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Jméno</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Kontakty</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Schůzky</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Prodeje</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Konverze</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Obrat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => {
                const isMe = row.userId === user?.id;
                return (
                  <tr
                    key={row.userId}
                    className={isMe ? 'bg-brand-500/10 border-l-4 border-brand-500' : 'hover:bg-slate-50'}
                  >
                    <td className="px-4 py-3 font-semibold text-slate-700">
                      {MEDALS[idx] ?? idx + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {row.firstName} {row.lastName}
                      {isMe && <span className="ml-2 text-xs text-brand-600">(ty)</span>}
                      <div className="text-xs font-normal text-slate-500">
                        {row.careerLevelEmoji} {row.careerLevel}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.contactedCount}</td>
                    <td className="px-4 py-3">{row.meetingsCount}</td>
                    <td className="px-4 py-3">{row.soldCount}</td>
                    <td className="px-4 py-3">{row.conversionRate}%</td>
                    <td className="px-4 py-3">
                      <Money value={row.revenue} />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500">
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
