'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Lead } from '@/types';

const OWNER_EMAIL = 'admin@crm.cz';

// Doplnění webů k 40 tetovacím salonům importovaným přes /bulk-import - při
// tom importu se oldWebsiteUrl omylem nevyplnilo, i když byl u většiny salonů
// web dohledaný. Studia bez vlastního webu (jen IG/FB) v mapě chybí záměrně.
const WEBSITES: Record<string, string> = {
  'Tattoo Nerd': 'https://tattoonerd.cz/',
  'Inkspired Tattoo': 'https://www.inkspired.cz/',
  'Our Cult Tattoo': 'https://www.ourculttattoo.com/',
  'Tattoo Lexus': 'https://www.tattoolexus.cz/',
  'Plague Tattoo': 'https://plaguetattoo.cz/',
  'Sisters Tattoo': 'https://sisterstattoo.cz/',
  'Mysteria Tattoo': 'https://mysteria-tattoo.cz/',
  'Z Tattoo Company': 'https://brno.tattoo/en/',
  'Denor Tattoo Club': 'https://www.denor-tattoo.cz/',
  'Tattoo Bar Brno': 'https://www.tattoobar.cz/',
  'Tattoo Dragoon': 'https://www.tattoo-dragoon.cz/',
  'Vean Tattoo': 'https://www.tattoo-vean.com/studio/brno',
  'AG Tattoo Studio': 'https://www.agtattoostudio.cz/',

  'Praha Tattoo Studio': 'https://www.prahatattoo.cz/',
  'Panter Tattoo': 'https://www.panter-tattoo.cz/cs/',
  'Magic Tattoo': 'https://www.magictattoo.cz/',
  'Vesna Tattoo': 'https://www.vesnatattoo.com/',
  'Art Tattoo Alien Prague': 'https://alientattoo.cz/en',
  'Homie Tattoo Studio': 'https://homietattoo.cz/en/',
  'Blue Fox Tattoo': 'https://bluefoxtattoo.cz/',
  'Icon Tattoo Studio': 'https://www.icontattoo.cz/en/',
  'No Name Tattoo & Piercing Studio': 'https://tattoo-praha.cz/en/home/',
  'Black House Tattoo': 'https://www.blackhousetattoo.cz/',
  'Studio Tattoo Mija': 'https://www.tattoomija.com/',
  'Black Rooster Tattoo & Art Studio': 'https://blackroosterstudio.com/',
  'TRIBO Tattoo & Piercing': 'https://www.tribo.cz/en/contact',

  'LiveAge Ostrava': 'https://ostrava.liveage.cz/',
  'Durion Tattoo': 'https://duriontattoo.com/',
  'Tetování Ostrava': 'https://www.tetovaniostrava.cz/',
  'Hades Tattoo': 'https://hadestattoo.cz/',
  'Denek Tattoo': 'https://denektattoo.com/en/',
  'Fantasmagoria Art': 'https://www.fantasmagoriaart.cz/',
  'Tetovací Studio DéjàVu': 'https://www.dejavutattoo.cz/',
  'VeAn Tattoo & Piercing Studio': 'https://vean-tattoo.cz/tetovaci-studia/ostrava',
  'Tattoo STYX': 'https://www.boris-styx.cz/',
  'Ink by Janet': 'https://inkbyjanet.cz/',
};

type RowResult = { label: string; status: 'pending' | 'ok' | 'error' | 'skipped'; message?: string };

export default function FixWebsiteLinksPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);

  const isOwner = user?.email === OWNER_EMAIL;

  async function handleRun() {
    setRunning(true);
    setDone(false);
    setResults([]);

    const { items } = await api.get<{ items: Lead[] }>('/leads?pageSize=200');
    const matches = items.filter((lead) => lead.company && WEBSITES[lead.company]);

    setResults(matches.map((lead) => ({ label: lead.company as string, status: 'pending' })));

    for (let i = 0; i < matches.length; i++) {
      const lead = matches[i];
      const url = WEBSITES[lead.company as string];
      if (lead.oldWebsiteUrl) {
        setResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: 'skipped', message: 'už má web vyplněný' } : r)),
        );
        continue;
      }
      try {
        await api.patch(`/leads/${lead.id}`, { oldWebsiteUrl: url });
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'ok' } : r)));
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Neznámá chyba';
        setResults((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: 'error', message } : r)));
      }
    }

    setRunning(false);
    setDone(true);
  }

  if (!isOwner) {
    return (
      <div>
        <Header title="Doplnění webů" />
        <div className="p-4 md:p-6">
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
            Tahle stránka je dostupná jen pro vlastníka účtu.
          </div>
        </div>
      </div>
    );
  }

  const okCount = results.filter((r) => r.status === 'ok').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div>
      <Header title="Doplnění webů u tetovacích salonů" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="card p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Jednorázově doplní odkaz na web u {Object.keys(WEBSITES).length} z 40 importovaných
            tetovacích salonů (zbytek vlastní web nemá, jen Instagram/Facebook). Klikni jen
            jednou.
          </p>
          <button className="btn-primary" onClick={handleRun} disabled={running || done}>
            {running ? `Doplňuji… (${okCount + skippedCount + errorCount}/${results.length})` : done ? 'Hotovo' : 'Doplnit weby'}
          </button>
        </div>

        {results.length > 0 && (
          <div className="card overflow-auto max-h-[60vh]">
            <table className="w-full text-sm border-separate border-spacing-0">
              <tbody className="divide-y divide-slate-100">
                {results.map((r, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-slate-700">{r.label}</td>
                    <td className="px-4 py-2 text-right">
                      {r.status === 'pending' && <span className="text-slate-400">čeká…</span>}
                      {r.status === 'ok' && <span className="text-emerald-600">✓ doplněno</span>}
                      {r.status === 'skipped' && <span className="text-slate-400">přeskočeno</span>}
                      {r.status === 'error' && (
                        <span className="text-red-500" title={r.message}>
                          ✗ chyba
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {done && (
          <div className="rounded-none bg-emerald-950/40 text-emerald-400 text-sm px-3 py-2 border border-emerald-900">
            Hotovo: {okCount} doplněno, {skippedCount} přeskočeno, {errorCount} selhalo.
          </div>
        )}
      </div>
    </div>
  );
}
