'use client';

import { LeadStatus, LeadStatusLabels, LEAD_STATUS_PIPELINE } from '@/types';
import clsx from 'clsx';
import { LEAD_STATUS_STYLES as STYLES } from './LeadStatusBadge';

/**
 * Stejný vizuál jako LeadStatusBadge, ale jako klikatelný <select> - umožňuje
 * změnit stav leadu přímo v tabulce (bez otevírání detailu). Pro NEGOTIATION
 * (schůzka)/WON volající místo přímé změny otevře příslušný modal (booking
 * schůzky / zadání hodnoty obchodu) - viz handleStatusChange na volající
 * stránce. Nabídka v selectu obsahuje jen aktuální stavy pipeline (bez
 * deprecated hodnot) - pokud má lead ještě starou hodnotu, zobrazí se navíc
 * jako aktuálně vybraná možnost, ať select nezůstane "prázdný".
 */
export function LeadStatusSelect({
  status,
  disabled,
  onChange,
}: {
  status: LeadStatus;
  disabled?: boolean;
  onChange: (next: LeadStatus) => void;
}) {
  const isDeprecatedValue = !LEAD_STATUS_PIPELINE.includes(status);

  return (
    <select
      className={clsx('badge cursor-pointer', STYLES[status])}
      value={status}
      disabled={disabled}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.value as LeadStatus)}
    >
      {isDeprecatedValue && (
        <option value={status} className="bg-surface-card text-white">
          {LeadStatusLabels[status]}
        </option>
      )}
      {LEAD_STATUS_PIPELINE.map((value) => (
        <option key={value} value={value} className="bg-surface-card text-white">
          {LeadStatusLabels[value]}
        </option>
      ))}
    </select>
  );
}
