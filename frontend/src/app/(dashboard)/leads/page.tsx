'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { KanbanBoard } from '@/components/KanbanBoard';
import { LeadStatusSelect } from '@/components/LeadStatusSelect';
import { NextActionCell } from '@/components/NextActionCell';
import { CreateLeadModal } from '@/components/CreateLeadModal';
import { MeetingBookerModal } from '@/components/MeetingBookerModal';
import { SoldModal } from '@/components/SoldModal';
import { api, getAccessToken } from '@/lib/api';
import { Lead, LeadStatus, LeadStatusLabels, LEAD_STATUS_PIPELINE, WON_STATUSES, User } from '@/types';
import { useAuth } from '@/lib/auth-context';
import { format } from 'date-fns';
import {
  computePriorityScore,
  getLastContactInfo,
  isActionDueTodayOrOverdue,
  priorityColorClass,
} from '@/lib/lead-utils';

interface LeadsResponse {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function LeadsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [agentId, setAgentId] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [assignAgentId, setAssignAgentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [bookerLead, setBookerLead] = useState<Lead | null>(null);
  const [soldLeadId, setSoldLeadId] = useState<string | null>(null);
  const [dueTodayOnly, setDueTodayOnly] = useState(false);
  const [view, setView] = useState<'table' | 'kanban'>('table');
  const isAdmin = user?.role === 'ADMIN';
  const OWNER_EMAIL = 'admin@crm.cz';
  const canDelete = user?.email === OWNER_EMAIL;
  const canSelect = isAdmin;

  // Výběr kontaktů "přejetím" myší přes čtverečky (drag-select) - jen pro
  // skutečnou myš (Pointer Events s pointerType 'mouse'). Na dotykových
  // zařízeních (mobil/tablet) do ničeho nezasahujeme a necháváme čistě
  // nativní chování checkboxu (onChange), aby šlo normálně odklikat víc
  // kontaktů za sebou - drag-select na mobilu nedává smysl a dřívější verze
  // (mousedown + preventDefault na všech pointerech) tam rozbíjela výběr.
  const isDraggingRef = useRef(false);
  const dragModeRef = useRef(true);

  useEffect(() => {
    function stopDragging() {
      isDraggingRef.current = false;
    }
    window.addEventListener('pointerup', stopDragging);
    return () => window.removeEventListener('pointerup', stopDragging);
  }, []);

  function applySelection(id: string, shouldSelect: boolean) {
    setSelected((prev) => {
      if (prev.has(id) === shouldSelect) return prev;
      const next = new Set(prev);
      if (shouldSelect) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function handleCheckboxPointerDown(id: string, e: React.PointerEvent) {
    if (e.pointerType !== 'mouse') return; // touch/pero necháme na nativním onChange
    // Jen si zapamatujeme směr tažení (vybrat/odškrtnout) - samotné přepnutí
    // téhle konkrétní checkboxy necháváme na nativním click/onChange. Dřív se
    // volalo i applySelection() rovnou tady s e.preventDefault() na pointerdown
    // v naději, že to zabrání dvojímu přepnutí - jenže preventDefault na
    // pointerdown u myši následný click nezastaví, takže se checkbox přepnul
    // pointerdown handlerem A HNED PAK znovu native onChange handlerem zpátky,
    // takže klik viditelně nic neudělal.
    dragModeRef.current = !selected.has(id);
    isDraggingRef.current = true;
  }

  function handleCheckboxPointerEnter(id: string, e: React.PointerEvent) {
    if (e.pointerType !== 'mouse') return;
    if (isDraggingRef.current) {
      applySelection(id, dragModeRef.current);
    }
  }

  async function load() {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    // "Dnes k vyřízení" a kanban zobrazení jsou klientské filtry/rozdělení napříč
    // více leady, než kolik jich je na jedné stránce - dočasně ignorují
    // stav-filtr a stáhnou víc řádků najednou (kanban je potřebuje všechny
    // najednou, ať má z čeho postavit sloupce).
    const bigFetch = dueTodayOnly || view === 'kanban';
    if (!bigFetch && status) params.set('status', status);
    if (agentId) params.set('agentId', agentId);
    params.set('page', String(bigFetch ? 1 : page));
    params.set('pageSize', bigFetch ? '200' : '20');

    const res = await api.get<LeadsResponse>(`/leads?${params.toString()}`);
    setData(res);
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (visibleItems.length === 0) return;
    const allSelected = visibleItems.every((l) => selected.has(l.id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        visibleItems.forEach((l) => next.delete(l.id));
      } else {
        visibleItems.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return;
    if (!confirm(`Opravdu smazat ${selected.size} vybraných leadů? Tuto akci nelze vrátit zpět.`)) {
      return;
    }
    setDeleting(true);
    try {
      await api.post('/leads/bulk-delete', { ids: Array.from(selected) });
      setSelected(new Set());
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Smazání se nepovedlo');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkAssign() {
    if (selected.size === 0) return;
    setAssigning(true);
    try {
      await api.post('/leads/bulk-reassign', {
        ids: Array.from(selected),
        agentId: assignAgentId || null,
      });
      setSelected(new Set());
      setAssignAgentId('');
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Přiřazení se nepovedlo');
    } finally {
      setAssigning(false);
    }
  }

  async function handleStatusChange(lead: Lead, nextStatus: LeadStatus) {
    if (nextStatus === lead.status) return;
    // NEGOTIATION (dřív MEETING_SCHEDULED) a WON (dřív SOLD) potřebují dodatečná
    // data (termín schůzky / hodnotu obchodu) - otevřeme stejné modaly jako na
    // detailu leadu, jinam měníme rovnou.
    if (nextStatus === 'NEGOTIATION' || nextStatus === 'MEETING_SCHEDULED') {
      setBookerLead(lead);
      return;
    }
    if (nextStatus === 'WON' || nextStatus === 'SOLD') {
      setSoldLeadId(lead.id);
      return;
    }
    try {
      await api.patch(`/leads/${lead.id}/status`, { status: nextStatus });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Změna stavu se nepovedla');
    }
  }

  async function handleExport() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
    const res = await fetch(`${apiUrl}/leads/export/csv`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'leady-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    setSelected(new Set());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, status, agentId, page, dueTodayOnly, view]);

  const visibleItems = dueTodayOnly
    ? (data?.items ?? []).filter(isActionDueTodayOrOverdue)
    : data?.items ?? [];

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get<User[]>('/users?role=AGENT').then(setAgents).catch(() => {});
    }
  }, [user]);

  return (
    <div>
      <Header title="Leady" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="input max-w-xs"
            placeholder="Hledat jméno, telefon, email, firmu…"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <div className="flex border border-hairline-strong overflow-hidden">
            <button
              className={`px-3 py-2 text-sm font-semibold tracking-wide transition-colors ${
                view === 'table' ? 'bg-brand-600 text-white' : 'bg-surface-card text-ink hover:bg-surface-elevated'
              }`}
              onClick={() => setView('table')}
            >
              📋 Tabulka
            </button>
            <button
              className={`px-3 py-2 text-sm font-semibold tracking-wide transition-colors ${
                view === 'kanban' ? 'bg-brand-600 text-white' : 'bg-surface-card text-ink hover:bg-surface-elevated'
              }`}
              onClick={() => setView('kanban')}
            >
              🗂️ Kanban
            </button>
          </div>
          {view === 'table' && (
            <>
              <select
                className="input max-w-[180px]"
                value={status}
                disabled={dueTodayOnly}
                onChange={(e) => {
                  setPage(1);
                  setStatus(e.target.value);
                }}
              >
                <option value="">Všechny stavy</option>
                {LEAD_STATUS_PIPELINE.map((v) => (
                  <option key={v} value={v}>
                    {LeadStatusLabels[v]}
                  </option>
                ))}
              </select>
              <button
                className={status === 'WON' && !dueTodayOnly ? 'btn-primary' : 'btn-secondary'}
                disabled={dueTodayOnly}
                onClick={() => {
                  setPage(1);
                  setStatus((s) => (s === 'WON' ? '' : 'WON'));
                }}
              >
                🏆 Jen prodané
              </button>
              <button
                className={dueTodayOnly ? 'btn-primary' : 'btn-secondary'}
                onClick={() => {
                  setPage(1);
                  setDueTodayOnly((v) => !v);
                }}
              >
                🔥 Dnes k vyřízení
              </button>
            </>
          )}
          {user?.role === 'ADMIN' && (
            <select
              className="input max-w-[180px]"
              value={agentId}
              onChange={(e) => {
                setPage(1);
                setAgentId(e.target.value);
              }}
            >
              <option value="">Všichni obchodníci</option>
              {user && (
                <option value={user.id}>
                  {user.firstName} {user.lastName} (já)
                </option>
              )}
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.firstName} {a.lastName}
                </option>
              ))}
            </select>
          )}

          <div className="ml-auto flex gap-2">
            {user?.role === 'ADMIN' && (
              <button className="btn-secondary" onClick={handleExport}>
                Export CSV
              </button>
            )}
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              + Nový lead
            </button>
          </div>
        </div>

        {canSelect && selected.size > 0 && (
          <div className="card p-3 flex flex-wrap items-center justify-between gap-3 bg-amber-50 border-amber-200">
            <span className="text-sm font-medium text-amber-800">
              Vybráno {selected.size} {selected.size === 1 ? 'lead' : selected.size < 5 ? 'leady' : 'leadů'}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button className="btn-secondary" onClick={() => setSelected(new Set())}>
                Zrušit výběr
              </button>
              <select
                className="input max-w-[200px]"
                value={assignAgentId}
                onChange={(e) => setAssignAgentId(e.target.value)}
              >
                <option value="">Zrušit přiřazení</option>
                {user && (
                  <option value={user.id}>
                    {user.firstName} {user.lastName} (já)
                  </option>
                )}
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.firstName} {a.lastName}
                  </option>
                ))}
              </select>
              <button className="btn-primary" disabled={assigning} onClick={handleBulkAssign}>
                {assigning ? 'Přiřazuji…' : `Přiřadit vybrané (${selected.size})`}
              </button>
              {canDelete && (
                <button className="btn-danger" disabled={deleting} onClick={handleBulkDelete}>
                  {deleting ? 'Mažu…' : `Smazat vybrané (${selected.size})`}
                </button>
              )}
            </div>
          </div>
        )}

        {view === 'kanban' && (
          <p className="text-sm text-muted">
            Kanban zobrazuje leady napříč zjednodušeným pipeline. Karty přetáhni do jiného sloupce pro
            změnu stavu.
          </p>
        )}
        {data && !dueTodayOnly && view === 'table' && (
          <p className="text-sm text-slate-500">
            Celkem leadů: <strong className="text-slate-700">{data.total}</strong>
          </p>
        )}
        {dueTodayOnly && view === 'table' && (
          <p className="text-sm text-slate-500">
            🔥 K vyřízení: <strong className="text-slate-700">{visibleItems.length}</strong>
            {data && data.total > data.items.length && (
              <span className="text-slate-400"> (prohledáno prvních {data.items.length} z {data.total} leadů)</span>
            )}
          </p>
        )}

        {view === 'kanban' && (
          <KanbanBoard
            leads={data?.items ?? []}
            onStatusChange={handleStatusChange}
            onAddLead={() => setShowCreate(true)}
          />
        )}

        {view === 'table' && (
        <div className="card overflow-auto max-h-[65vh]">
          <table className="w-full min-w-[720px] text-sm border-separate border-spacing-0">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                {canSelect && (
                  <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={visibleItems.length > 0 && visibleItems.every((l) => selected.has(l.id))}
                      onChange={toggleAll}
                      aria-label="Vybrat vše"
                    />
                  </th>
                )}
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-right px-3 py-3 w-12">#</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Jméno</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Kontakt</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Firma</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Obchodník</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Stav</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Další akce</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Poslední kontakt</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">⭐</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-center px-2 py-3 w-10" title="Odkaz na starý web">🔗</th>
                <th className="sticky top-0 z-10 bg-slate-50 shadow-sm text-left px-4 py-3">Vytvořeno</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleItems.map((lead) => (
                <tr
                  key={lead.id}
                  className={
                    lead.status === 'WON' || lead.status === 'SOLD'
                      ? 'bg-emerald-50 border-l-4 border-emerald-500 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50'
                      : 'hover:bg-surface-elevated'
                  }
                >
                  {canSelect && (
                    <td
                      className="px-4 py-3 select-none"
                      onPointerEnter={(e) => handleCheckboxPointerEnter(lead.id, e)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(lead.id)}
                        onChange={() => toggleOne(lead.id)}
                        onPointerDown={(e) => handleCheckboxPointerDown(lead.id, e)}
                        aria-label={`Vybrat ${lead.firstName} ${lead.lastName}`}
                      />
                    </td>
                  )}
                  <td className="px-3 py-3 text-right text-slate-400 tabular-nums">
                    {lead.sequenceNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/leads/${lead.id}`}
                      className="font-medium text-brand-700 hover:underline"
                    >
                      {lead.isPrivate && '🔒 '}
                      {lead.firstName} {lead.lastName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.phone}
                    {lead.email && (
                      <>
                        <br />
                        {lead.email}
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{lead.company ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {lead.assignedAgent
                      ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <LeadStatusSelect
                      status={lead.status}
                      onChange={(next) => handleStatusChange(lead, next)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <NextActionCell lead={lead} onSaved={load} />
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const info = getLastContactInfo(lead);
                      return <span className={info.colorClass}>{info.text}</span>;
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {(() => {
                      const score = computePriorityScore(lead);
                      return <span className={priorityColorClass(score)}>⭐ {score}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-3 text-center">
                    {lead.oldWebsiteUrl ? (
                      <a
                        href={lead.oldWebsiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-brand-700 hover:underline"
                        title={lead.oldWebsiteUrl}
                        onClick={(e) => e.stopPropagation()}
                      >
                        🔗
                      </a>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {format(new Date(lead.createdAt), 'd. M. yyyy')}
                  </td>
                </tr>
              ))}
              {visibleItems.length === 0 && (
                <tr>
                  <td colSpan={canSelect ? 11 : 10} className="text-center py-8 text-slate-500">
                    {dueTodayOnly
                      ? 'Žádné leady dnes k vyřízení 🎉'
                      : 'Žádné leady neodpovídají filtru'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {view === 'table' && data && !dueTodayOnly && data.totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>
              Stránka {data.page} z {data.totalPages} ({data.total} leadů)
            </span>
            <div className="flex gap-2">
              <button
                className="btn-secondary"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Předchozí
              </button>
              <button
                className="btn-secondary"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Další
              </button>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateLeadModal onClose={() => setShowCreate(false)} onCreated={load} />
      )}
      {bookerLead && (
        <MeetingBookerModal
          leadId={bookerLead.id}
          leadName={`${bookerLead.firstName} ${bookerLead.lastName}`}
          onClose={() => setBookerLead(null)}
          onBooked={load}
        />
      )}
      {soldLeadId && (
        <SoldModal leadId={soldLeadId} onClose={() => setSoldLeadId(null)} onDone={load} />
      )}
    </div>
  );
}
