'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lead, LeadStatus, LeadStatusLabels, LEAD_STATUS_PIPELINE } from '@/types';
import { LEAD_STATUS_STYLES } from './LeadStatusBadge';
import { computePriorityScore, getLastContactInfo, priorityColorClass } from '@/lib/lead-utils';

interface KanbanBoardProps {
  leads: Lead[];
  onStatusChange: (lead: Lead, nextStatus: LeadStatus) => void;
}

/**
 * Kanban zobrazení leadů vedle stávající tabulky (viz leads/page.tsx).
 * Sloupce = zjednodušený pipeline (LEAD_STATUS_PIPELINE), přetažení karty
 * do jiného sloupce zavolá stejnou onStatusChange logiku jako select v
 * tabulce (včetně booking/sold modalů u NEGOTIATION a WON).
 * Nativní HTML5 drag & drop - žádná další závislost navíc.
 */
export function KanbanBoard({ leads, onStatusChange }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<LeadStatus | null>(null);

  const columns = LEAD_STATUS_PIPELINE.map((status) => ({
    status,
    leads: leads.filter((l) => l.status === status),
  }));

  function handleDrop(status: LeadStatus) {
    setDragOverStatus(null);
    if (!draggedId) return;
    const lead = leads.find((l) => l.id === draggedId);
    setDraggedId(null);
    if (!lead) return;
    onStatusChange(lead, status);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((col) => (
        <div
          key={col.status}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverStatus(col.status);
          }}
          onDragLeave={() => setDragOverStatus((s) => (s === col.status ? null : s))}
          onDrop={() => handleDrop(col.status)}
          className={`w-72 shrink-0 rounded-none border transition-colors ${
            dragOverStatus === col.status
              ? 'border-brand-500 bg-surface-elevated'
              : 'border-hairline bg-surface-soft'
          }`}
        >
          <div className="px-3 py-2.5 border-b border-hairline flex items-center justify-between">
            <span className={`badge ${LEAD_STATUS_STYLES[col.status]}`}>
              {LeadStatusLabels[col.status]}
            </span>
            <span className="text-xs text-muted tabular-nums">{col.leads.length}</span>
          </div>

          <div className="p-2 space-y-2 min-h-[120px] max-h-[65vh] overflow-y-auto">
            {col.leads.map((lead) => {
              const score = computePriorityScore(lead);
              const lastContact = getLastContactInfo(lead);
              return (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => {
                    setDraggedId(lead.id);
                    e.dataTransfer.setData('text/plain', lead.id);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragEnd={() => setDraggedId(null)}
                  className={`card p-3 cursor-grab active:cursor-grabbing ${
                    draggedId === lead.id ? 'opacity-40' : ''
                  }`}
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-sm text-brand-500 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.isPrivate && '🔒 '}
                    {lead.firstName} {lead.lastName}
                  </Link>
                  {lead.company && (
                    <p className="text-xs text-muted mt-0.5 truncate">{lead.company}</p>
                  )}
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={lastContact.colorClass}>{lastContact.text}</span>
                    <span className={priorityColorClass(score)}>⭐ {score}</span>
                  </div>
                </div>
              );
            })}
            {col.leads.length === 0 && (
              <p className="text-xs text-muted text-center py-6">Žádné leady</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
