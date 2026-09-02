import { differenceInCalendarDays } from 'date-fns';
import { Lead, LOST_STATUSES, WON_STATUSES } from '@/types';

/**
 * Pomocné funkce pro redesign leadů (2026-08) - "Poslední kontakt" barevně,
 * jednoduché pravidlové skóre priority a detekce "k vyřízení dnes". Žádná AI,
 * jen čitelná pravidla, ať jde kdykoliv vysvětlit, proč má lead danou hodnotu.
 */

export function isFinalStatus(lead: Lead): boolean {
  return WON_STATUSES.includes(lead.status) || LOST_STATUSES.includes(lead.status);
}

/** Text + barva pro sloupec "Poslední kontakt" */
export function getLastContactInfo(lead: Lead): { text: string; colorClass: string } {
  if (!lead.lastContactedAt) {
    return { text: 'Nikdy nekontaktováno', colorClass: 'text-red-400' };
  }
  const days = differenceInCalendarDays(new Date(), new Date(lead.lastContactedAt));
  if (days <= 0) return { text: 'Dnes', colorClass: 'text-emerald-400' };
  if (days === 1) return { text: 'Včera', colorClass: 'text-emerald-400' };
  if (days <= 3) return { text: `Před ${days} dny`, colorClass: 'text-emerald-400' };
  if (days <= 7) return { text: `Čekáme ${days} dní na odpověď`, colorClass: 'text-amber-400' };
  return { text: `Čekáme ${days} dní na odpověď`, colorClass: 'text-red-400' };
}

/** true = "Další akce" má termín dnes nebo v minulosti (po termínu) a lead ještě není uzavřený */
export function isActionDueTodayOrOverdue(lead: Lead): boolean {
  if (isFinalStatus(lead)) return false;
  if (!lead.nextActionDueDate) return false;
  const days = differenceInCalendarDays(new Date(lead.nextActionDueDate), new Date());
  return days <= 0;
}

const STAGE_SCORE: Record<string, number> = {
  NEW: 20,
  TO_CONTACT: 30,
  CONTACTED: 45,
  INTERESTED: 60,
  PROPOSAL: 75,
  NEGOTIATION: 88,
  WON: 100,
  LOST: 0,
  // deprecated hodnoty - podobná váha jako jejich nový ekvivalent
  IN_PROGRESS: 35,
  MEETING_SCHEDULED: 85,
  SOLD: 100,
  REJECTED: 0,
};

/**
 * Jednoduché pravidlové skóre 0-100 ("⭐ Potenciál"), NE AI - jen čitelná
 * kombinace: fáze pipeline (hlavní váha) + bonus za akci "k vyřízení dnes"
 * + penalizace za dlouho nekontaktovaný lead.
 */
export function computePriorityScore(lead: Lead): number {
  let score = STAGE_SCORE[lead.status] ?? 20;

  if (isFinalStatus(lead)) return score;

  if (isActionDueTodayOrOverdue(lead)) score += 10;

  if (lead.lastContactedAt) {
    const days = differenceInCalendarDays(new Date(), new Date(lead.lastContactedAt));
    if (days > 14) score -= 15;
    else if (days > 7) score -= 8;
  } else {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

const FORGOTTEN_LEAD_DAYS = 7; // stejná hranice jako backend STALE_LEAD_DAYS (notifications.service.ts)

/** true = lead je "rozpracovaný" a dlouho (7+ dní) ho nikdo nekontaktoval */
export function isForgotten(lead: Lead): boolean {
  if (isFinalStatus(lead)) return false;
  const reference = lead.lastContactedAt ?? lead.createdAt;
  const days = differenceInCalendarDays(new Date(), new Date(reference));
  return days >= FORGOTTEN_LEAD_DAYS;
}

export function priorityColorClass(score: number): string {
  if (score >= 70) return 'text-emerald-400';
  if (score >= 40) return 'text-amber-400';
  return 'text-slate-400';
}
