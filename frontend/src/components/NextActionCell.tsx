'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { api } from '@/lib/api';
import { Lead, NextActionEmojis, NextActionLabels, NextActionType } from '@/types';
import { isActionDueTodayOrOverdue } from '@/lib/lead-utils';

const ACTION_OPTIONS: NextActionType[] = ['CALL', 'EMAIL', 'FOLLOW_UP', 'SEND_PROPOSAL', 'MEETING', 'WAITING'];

/**
 * Inline editovatelná "Další akce" - odděleně od stavu (status) obchodu.
 * Klik na badge otevře malý formulář (typ akce + termín), uložení jde
 * automaticky přes PATCH /leads/:id/next-action. Kliknutí nešíří dál (např.
 * v tabulce leadů by jinak otevřelo detail leadu).
 */
export function NextActionCell({ lead, onSaved }: { lead: Lead; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [actionValue, setActionValue] = useState<NextActionType | ''>(lead.nextAction ?? '');
  const [dueDate, setDueDate] = useState(
    lead.nextActionDueDate ? format(new Date(lead.nextActionDueDate), 'yyyy-MM-dd') : '',
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/leads/${lead.id}/next-action`, {
        nextAction: actionValue || null,
        nextActionDueDate: dueDate || null,
      });
      setEditing(false);
      onSaved();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Uložení další akce se nepovedlo');
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const overdue = isActionDueTodayOrOverdue(lead);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        className={
          'badge cursor-pointer text-left ' +
          (lead.nextAction
            ? overdue
              ? 'bg-red-950/40 text-red-400 border border-red-900'
              : 'bg-slate-800/60 text-slate-300 border border-slate-600'
            : 'bg-transparent text-slate-500 border border-dashed border-slate-700')
        }
        title={dueDate ? `Termín: ${format(new Date(dueDate), 'd. M. yyyy')}` : undefined}
      >
        {lead.nextAction ? (
          <>
            {NextActionEmojis[lead.nextAction]} {NextActionLabels[lead.nextAction]}
            {dueDate && ` · ${format(new Date(dueDate), 'd. M.')}`}
          </>
        ) : (
          '+ Přidat akci'
        )}
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-1 bg-surface-card border border-slate-700 rounded-none p-2 min-w-[180px]"
      onClick={(e) => e.stopPropagation()}
    >
      <select
        className="input text-xs py-1"
        value={actionValue}
        onChange={(e) => setActionValue(e.target.value as NextActionType | '')}
      >
        <option value="">— žádná akce —</option>
        {ACTION_OPTIONS.map((a) => (
          <option key={a} value={a}>
            {NextActionEmojis[a]} {NextActionLabels[a]}
          </option>
        ))}
      </select>
      <input
        type="date"
        className="input text-xs py-1"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
      />
      <div className="flex gap-1">
        <button className="btn-primary text-xs py-1 flex-1" disabled={saving} onClick={save}>
          {saving ? 'Ukládám…' : 'Uložit'}
        </button>
        <button className="btn-secondary text-xs py-1" onClick={() => setEditing(false)}>
          Zrušit
        </button>
      </div>
    </div>
  );
}
