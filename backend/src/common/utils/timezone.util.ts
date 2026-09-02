/**
 * Pomocné funkce pro práci s časovým pásmem Europe/Prague, nezávisle na tom,
 * v jakém TZ běží samotný server (Render defaultně běží v UTC).
 *
 * Bez tohoto přepočtu by např. "pracovní doba 9:00-17:00" nastavená v Nastavení
 * byla interpretována jako 9:00-17:00 UTC, což je v létě (CEST, UTC+2) ve
 * skutečnosti 11:00-19:00 českého času - přesně tenhle posun byl vidět
 * v booking okně (sloty začínaly na 11:00 místo 9:00).
 */

const APP_TIME_ZONE = 'Europe/Prague';

/** Zjistí offset (v minutách) daného časového pásma vůči UTC pro konkrétní okamžik. */
function getTimezoneOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) === 24 ? 0 : Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return (asUtc - date.getTime()) / 60000;
}

/**
 * Vytvoří přesný UTC okamžik odpovídající danému kalendářnímu dni a hodině
 * v českém čase (Europe/Prague), správně s ohledem na letní/zimní čas.
 */
export function pragueWallTimeToUtc(dateISO: string, hour: number, minute = 0): Date {
  const [year, month, day] = dateISO.split('-').map(Number);
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMin = getTimezoneOffsetMinutes(new Date(naiveUtc), APP_TIME_ZONE);
  return new Date(naiveUtc - offsetMin * 60000);
}
