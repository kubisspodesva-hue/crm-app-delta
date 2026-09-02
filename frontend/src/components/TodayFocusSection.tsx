'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Lead, LeadStatusLabels, LEAD_STATUS_PIPELINE } from '@/types';
import {
  computePriorityScore,
  isActionDueTodayOrOverdue,
  isFinalStatus,
  isForgotten,
  priorityColorClass,
} from '@/lib/lead-utils';

/**
 * Akčně orientovaný přehled "Dnes" na dashboardu - nahrazuje pasivní "Celkem
 * leadů: 48" konkrétním "co mám dnes udělat". Stahuje leady (a rozpad podle
 * stavu) sám za sebe - endpoint /leads už respektuje roli (agent vidí jen
 * svoje, admin celý tým), takže tahle sekce funguje na dashboardu obou rolí
 * beze změny.
 */
export function TodayFocusSection() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [statusCounts, setStatusCounts] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    api
      .get<{ items: Lead[] }>('/leads?pageSize=200&sortBy=createdAt&sortDir=desc')
      .then((res) => setLeads(res.items))
      .catch(() => setLeads([]));
    api
      .get<Record<string, number>>('/leads/stats/by-status')
      .then(setStatusCounts)
      .catch(() => setStatusCounts(null));
  }, []);

  if (!leads) {
    return (
      <div className="card p-5">
        <p className="text-sm text-slate-500">Načítám dnešní přehled…</p>
      </div>
    );
  }

  const dueToday = leads.filter(isActionDueTodayOrOverdue);
  const forgotten = leads.filter(isForgotten);
  const forgottenIds = new Set(forgotten.map((l) => l.id));
  const dueTodayIds = new Set(dueToday.map((l) => l.id));
  const focusCount = new Set([...dueTodayIds, ...forgottenIds]).size;

  const topLeads = leads
    .filter((l) => !isFinalStatus(l))
    .map((l) => ({ lead: l, score: computePriorityScore(l) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-slate-900">
          {focusCount > 0
            ? `🔥 Dobré ráno, dnes máš ${focusCount} ${
                focusCount === 1 ? 'věc' : focusCount < 5 ? 'věci' : 'věcí'
              } s nejvyšší prioritou`
            : '✅ Dobré ráno, dnes nic nehoří'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Akce k vyřízení dnes a leady, které dlouho čekají na kontakt.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">📞 K vyřízení dnes ({dueToday.length})</h3>
          {dueToday.length === 0 && <p className="text-sm text-slate-500">Nic naléhavého - klid.</p>}
          <ul className="space-y-2">
            {dueToday.slice(0, 6).map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="text-sm text-brand-700 hover:underline">
                  {l.firstName} {l.lastName}
                </Link>
                {l.company && <span className="text-slate-500 text-sm"> · {l.company}</span>}
              </li>
            ))}
          </ul>
          {dueToday.length > 6 && (
            <Link href="/leads" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
              zobrazit všech {dueToday.length} →
            </Link>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">⚠️ Zapomenuté leady ({forgotten.length})</h3>
          {forgotten.length === 0 && <p className="text-sm text-slate-500">Nikdo nečeká déle než týden 👍</p>}
          <ul className="space-y-2">
            {forgotten.slice(0, 6).map((l) => (
              <li key={l.id}>
                <Link href={`/leads/${l.id}`} className="text-sm text-brand-700 hover:underline">
                  {l.firstName} {l.lastName}
                </Link>
                {l.company && <span className="text-slate-500 text-sm"> · {l.company}</span>}
              </li>
            ))}
          </ul>
          {forgotten.length > 6 && (
            <Link href="/leads" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
              zobrazit všech {forgotten.length} →
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {statusCounts && (
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-3">Pipeline podle stavu</h3>
            <div className="space-y-2">
              {LEAD_STATUS_PIPELINE.map((s) => {
                const count = statusCounts[s] ?? 0;
                const max = Math.max(1, ...LEAD_STATUS_PIPELINE.map((k) => statusCounts[k] ?? 0));
                return (
                  <div key={s} className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-24 shrink-0">{LeadStatusLabels[s]}</span>
                    <div className="flex-1 h-2 bg-slate-800/40 overflow-hidden">
                      <div
                        className="h-full bg-brand-600"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-3">⭐ Nejzajímavější leady</h3>
          {topLeads.length === 0 && <p className="text-sm text-slate-500">Zatím žádné rozpracované leady</p>}
          <ul className="space-y-2">
            {topLeads.map(({ lead, score }) => (
              <li key={lead.id} className="flex items-center justify-between">
                <Link href={`/leads/${lead.id}`} className="text-sm text-brand-700 hover:underline">
                  {lead.firstName} {lead.lastName}
                </Link>
                <span className={`text-sm font-medium ${priorityColorClass(score)}`}>⭐ {score}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
