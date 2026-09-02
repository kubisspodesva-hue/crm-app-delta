import { LeadStatus, LeadStatusLabels } from '@/types';
import clsx from 'clsx';

// Barvy pro nový 8stavový pipeline - postupně "chladnější" (šedá) na začátku,
// "teplejší" (modrá/fialová) uprostřed, zelená/červená u finálních stavů.
// Staré (deprecated) hodnoty mají stejné barvy jako jejich nový ekvivalent,
// ať po dobu přechodu vypadají konzistentně.
const STYLES: Record<LeadStatus, string> = {
  NEW: 'bg-slate-800/60 text-slate-300 border border-slate-600',
  TO_CONTACT: 'bg-amber-950/40 text-amber-400 border border-amber-900',
  CONTACTED: 'bg-sky-950/40 text-sky-400 border border-sky-900',
  INTERESTED: 'bg-cyan-950/40 text-cyan-400 border border-cyan-900',
  PROPOSAL: 'bg-indigo-950/40 text-indigo-400 border border-indigo-900',
  NEGOTIATION: 'bg-blue-950/40 text-blue-400 border border-blue-900',
  WON: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900',
  LOST: 'bg-red-950/40 text-red-400 border border-red-900',
  // deprecated - stejné barvy jako nový ekvivalent
  IN_PROGRESS: 'bg-amber-950/40 text-amber-400 border border-amber-900',
  MEETING_SCHEDULED: 'bg-blue-950/40 text-blue-400 border border-blue-900',
  SOLD: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900',
  REJECTED: 'bg-red-950/40 text-red-400 border border-red-900',
};

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return <span className={clsx('badge', STYLES[status])}>{LeadStatusLabels[status]}</span>;
}

export { STYLES as LEAD_STATUS_STYLES };
