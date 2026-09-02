/**
 * Pomocné funkce pro výpočet časových rozsahů (den/týden/měsíc, aktuální i minulý).
 * Týden začíná pondělím (ISO 8601), aby odpovídal běžné české konvenci.
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay(); // 0 = neděle
  const diff = day === 0 ? 6 : day - 1; // posun na pondělí
  d.setDate(d.getDate() - diff);
  return d;
}

export function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return endOfDay(end);
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function today(): DateRange {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

export function thisWeek(): DateRange {
  const now = new Date();
  return { start: startOfWeek(now), end: endOfWeek(now) };
}

export function lastWeek(): DateRange {
  const now = new Date();
  const start = startOfWeek(now);
  start.setDate(start.getDate() - 7);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start, end: endOfDay(end) };
}

export function thisMonth(): DateRange {
  const now = new Date();
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

export function lastMonth(): DateRange {
  const now = new Date();
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return { start: startOfMonth(prevMonthDate), end: endOfMonth(prevMonthDate) };
}

/** Procentuální změna mezi dvěma hodnotami, ošetřuje dělení nulou */
export function percentChange(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

/** Posledních N týdnů jako pole rozsahů, od nejstaršího po nejnovější */
export function lastNWeeks(n: number): DateRange[] {
  const ranges: DateRange[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const ref = new Date(now);
    ref.setDate(ref.getDate() - i * 7);
    ranges.push({ start: startOfWeek(ref), end: endOfWeek(ref) });
  }
  return ranges;
}
