'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Header } from '@/components/Header';
import { LeadStatusBadge } from '@/components/LeadStatusBadge';
import { NextActionCell } from '@/components/NextActionCell';
import { MeetingBookerModal } from '@/components/MeetingBookerModal';
import { SoldModal } from '@/components/SoldModal';
import { EditLeadModal } from '@/components/EditLeadModal';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Lead, LeadStatus, LeadStatusLabels, LEAD_STATUS_PIPELINE, User } from '@/types';
import { computePriorityScore, getLastContactInfo, priorityColorClass } from '@/lib/lead-utils';

const HISTORY_ACTION_LABELS: Record<string, string> = {
  CREATED: 'Vytvořen',
  STATUS_CHANGED: 'Změna stavu',
  ASSIGNED: 'Přeřazen',
  NOTE_ADDED: 'Poznámka',
  CONTACTED: 'Kontaktován',
  MEETING_BOOKED: 'Schůzka domluvena',
  MEETING_CANCELLED: 'Schůzka zrušena',
  FIELD_UPDATED: 'Upraveny údaje',
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showBooker, setShowBooker] = useState(false);
  const [showSold, setShowSold] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agents, setAgents] = useState<User[]>([]);
  const [reassigning, setReassigning] = useState(false);

  async function load() {
    try {
      const data = await api.get<Lead>(`/leads/${params.id}`);
      setLead(data);
      setNote(data.notes ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Lead se nepodařilo načíst');
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    api
      .get<User[]>('/users?role=AGENT')
      .then(setAgents)
      .catch(() => {
        /* seznam obchodníků není kritický, ticho v případě chyby */
      });
  }, [user?.role]);

  async function handleReassign(agentId: string) {
    if (!lead) return;
    setReassigning(true);
    setError(null);
    try {
      await api.patch(`/leads/${lead.id}/reassign`, { agentId: agentId === '' ? null : agentId });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Přeřazení se nezdařilo');
    } finally {
      setReassigning(false);
    }
  }

  async function handleStatusChange(newStatus: LeadStatus) {
    if (!lead) return;
    setError(null);

    if (newStatus === 'NEGOTIATION' || newStatus === 'MEETING_SCHEDULED') {
      setShowBooker(true);
      return;
    }
    if (newStatus === 'WON' || newStatus === 'SOLD') {
      setShowSold(true);
      return;
    }

    try {
      await api.patch(`/leads/${lead.id}/status`, { status: newStatus });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Změna stavu se nezdařila');
    }
  }

  async function handleSaveNote() {
    if (!lead) return;
    setSavingNote(true);
    try {
      await api.post(`/leads/${lead.id}/notes`, { note });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Poznámku se nepodařilo uložit');
    } finally {
      setSavingNote(false);
    }
  }

  async function handleMarkContacted() {
    if (!lead) return;
    try {
      await api.post(`/leads/${lead.id}/contacted`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Nepodařilo se zaznamenat kontakt');
    }
  }

  if (!lead) {
    return (
      <div>
        <Header title="Detail leadu" />
        <div className="p-4 md:p-6">
          {error ? (
            <p className="text-red-600">{error}</p>
          ) : (
            <p className="text-slate-500">Načítání…</p>
          )}
        </div>
      </div>
    );
  }

  const contactedToday =
    !!lead.lastContactedAt && new Date(lead.lastContactedAt).toDateString() === new Date().toDateString();

  return (
    <div>
      <Header title={`${lead.firstName} ${lead.lastName}`} />
      <div className="p-4 md:p-6 space-y-6">
        <button onClick={() => router.push('/leads')} className="text-sm text-brand-600 hover:underline">
          ← Zpět na seznam leadů
        </button>

        {error && (
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div
              className={`card p-5 ${
                lead.status === 'WON' || lead.status === 'SOLD' ? 'border-l-4 border-green-500 bg-green-50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {lead.isPrivate && '🔒 '}
                    {lead.firstName} {lead.lastName}
                  </h2>
                  {lead.isPrivate && (
                    <p className="text-xs text-violet-400 font-medium">Soukromý kontakt - vidíte jen vy</p>
                  )}
                  <p className="text-slate-500">{lead.company ?? 'Bez firmy'}</p>
                  <button
                    className="text-xs text-brand-500 hover:underline mt-1"
                    onClick={() => setShowEdit(true)}
                  >
                    ✏️ Upravit údaje
                  </button>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <LeadStatusBadge status={lead.status} />
                  <span className={`text-sm font-medium ${priorityColorClass(computePriorityScore(lead))}`}>
                    ⭐ Potenciál: {computePriorityScore(lead)}/100
                  </span>
                </div>
              </div>

              {/* Velká primární tlačítka - hlavní akce, co má obchodník s leadem udělat teď */}
              <div className="flex flex-wrap gap-2 mb-5">
                <a
                  href={`tel:${lead.phone}`}
                  className="btn-primary flex-1 min-w-[140px] text-center py-3 text-base"
                >
                  📞 Zavolat
                </a>
                {lead.email ? (
                  <a
                    href={`mailto:${lead.email}`}
                    className="btn-secondary flex-1 min-w-[140px] text-center py-3 text-base"
                  >
                    ✉️ E-mail
                  </a>
                ) : (
                  <button
                    className="btn-secondary flex-1 min-w-[140px] py-3 text-base opacity-40 cursor-not-allowed"
                    disabled
                    title="Lead nemá vyplněný e-mail"
                  >
                    ✉️ E-mail
                  </button>
                )}
                <button
                  className="btn-secondary flex-1 min-w-[140px] py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed"
                  onClick={handleMarkContacted}
                  disabled={contactedToday}
                  title={contactedToday ? 'Tento lead byl dnes už kontaktován' : undefined}
                >
                  {contactedToday ? '✅ Dnes už kontaktováno' : '➕ Zaznamenat aktivitu'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Telefon</p>
                  <p className="font-medium">{lead.phone}</p>
                </div>
                <div>
                  <p className="text-slate-500">E-mail</p>
                  <p className="font-medium">{lead.email || '—'}</p>
                </div>
                <div>
                  <p className="text-slate-500">Odkaz na starý web</p>
                  {lead.oldWebsiteUrl ? (
                    <a
                      href={lead.oldWebsiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-brand-700 hover:underline break-all"
                    >
                      {lead.oldWebsiteUrl}
                    </a>
                  ) : (
                    <p className="font-medium">—</p>
                  )}
                </div>
                <div>
                  <p className="text-slate-500">Obchodník</p>
                  {user?.role === 'ADMIN' ? (
                    <select
                      className="input mt-1 w-full max-w-[220px]"
                      value={lead.assignedAgent?.id ?? ''}
                      disabled={reassigning}
                      onChange={(e) => handleReassign(e.target.value)}
                    >
                      <option value="">Nepřiřazeno</option>
                      {user && (
                        <option value={user.id}>
                          {user.firstName} {user.lastName} (já)
                        </option>
                      )}
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.firstName} {agent.lastName}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="font-medium">
                      {lead.assignedAgent
                        ? `${lead.assignedAgent.firstName} ${lead.assignedAgent.lastName}`
                        : '—'}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-slate-500">Vytvořeno</p>
                  <p className="font-medium">{format(new Date(lead.createdAt), 'd. M. yyyy HH:mm')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Poslední kontakt</p>
                  <p className={`font-medium ${getLastContactInfo(lead).colorClass}`}>
                    {getLastContactInfo(lead).text}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Další akce</p>
                  <div className="mt-1">
                    <NextActionCell lead={lead} onSaved={load} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100">
                <select
                  className="input max-w-[220px]"
                  value=""
                  onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                >
                  <option value="" disabled>
                    Změnit stav…
                  </option>
                  {LEAD_STATUS_PIPELINE.filter((value) => value !== lead.status).map((value) => (
                    <option key={value} value={value}>
                      {LeadStatusLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Interní poznámky (jen pro obchodníky)</h3>
              <textarea
                className="input"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <div className="flex justify-end mt-3">
                <button className="btn-primary" disabled={savingNote} onClick={handleSaveNote}>
                  {savingNote ? 'Ukládám…' : 'Uložit poznámku'}
                </button>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Historie změn</h3>
              <ol className="space-y-3">
                {lead.history?.map((h) => (
                  <li key={h.id} className="text-sm border-l-2 border-brand-200 pl-3">
                    <p className="font-medium text-slate-800">
                      {HISTORY_ACTION_LABELS[h.action] ?? h.action}
                      <span className="text-slate-400 font-normal">
                        {' '}
                        · {h.actor ? `${h.actor.firstName} ${h.actor.lastName}` : 'Smazaný uživatel'} ·{' '}
                        {format(new Date(h.createdAt), 'd. M. yyyy HH:mm')}
                      </span>
                    </p>
                    {h.fromValue && h.toValue && (
                      <p className="text-slate-600">
                        {LeadStatusLabels[h.fromValue as LeadStatus] ?? h.fromValue} →{' '}
                        {LeadStatusLabels[h.toValue as LeadStatus] ?? h.toValue}
                      </p>
                    )}
                    {h.note && <p className="text-slate-600">{h.note}</p>}
                  </li>
                ))}
                {(!lead.history || lead.history.length === 0) && (
                  <p className="text-sm text-slate-500">Zatím žádná historie</p>
                )}
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="font-semibold text-slate-800 mb-3">Schůzky</h3>
              {lead.meetings && lead.meetings.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {lead.meetings.map((m) => (
                    <li key={m.id} className="border border-slate-200 rounded-none p-3">
                      <p className="font-medium">
                        {format(new Date(m.startTime), 'd. M. yyyy HH:mm')} –{' '}
                        {format(new Date(m.endTime), 'HH:mm')}
                      </p>
                      <p className="text-slate-500">{m.status}</p>
                      {m.notes && <p className="text-slate-600 mt-1">{m.notes}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">Žádné naplánované schůzky</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {showBooker && (
        <MeetingBookerModal
          leadId={lead.id}
          leadName={`${lead.firstName} ${lead.lastName}`}
          onClose={() => setShowBooker(false)}
          onBooked={load}
        />
      )}
      {showSold && (
        <SoldModal leadId={lead.id} onClose={() => setShowSold(false)} onDone={load} />
      )}
      {showEdit && (
        <EditLeadModal lead={lead} onClose={() => setShowEdit(false)} onSaved={load} />
      )}
    </div>
  );
}
