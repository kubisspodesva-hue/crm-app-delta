import { LeadStatus, LeadStatusLabels } from '@/types';
import clsx from 'clsx';

// Barvy pro nový 8stavový pipeline - postupně "chladnější" (šedá) na začátku,
// "teplejší" (modrá/fialová) uprostřed, zelená/červená u finálních stavů.
// Staré (deprecated) hodnoty mají stejné barvy jako jejich nový ekvivalent,
// ať po dobu přechodu vypadají konzistentně.
//
// Světlá varianta (výchozí třídy) používá jemný barevný nádech + sytý text,
// tmavá varianta (dark:) je ta původní - tmavé pozadí + světlejší text. Bez
// dark: by odznaky v tmavém motivu byly příliš tmavé/nečitelné a naopak.
const STYLES: Record<LeadStatus, string> = {
  NEW: 'bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-600',
  TO_CONTACT: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  CONTACTED: 'bg-sky-100 text-sky-700 border border-sky-300 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
  INTERESTED: 'bg-cyan-100 text-cyan-700 border border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-900',
  PROPOSAL: 'bg-indigo-100 text-indigo-700 border border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-900',
  NEGOTIATION: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
  WON: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  LOST: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
  // deprecated - stejné barvy jako nový ekvivalent
  IN_PROGRESS: 'bg-amber-100 text-amber-700 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  MEETING_SCHEDULED: 'bg-blue-100 text-blue-700 border border-blue-300 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900',
  SOLD: 'bg-emerald-100 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  REJECTED: 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={clsx('badge', STYLES[status])}>{LeadStatusLabels[status]}</span>;
}

export { STYLES as LEAD_STATUS_STYLES };
