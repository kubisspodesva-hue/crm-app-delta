'use client';

import { useState } from 'react';
import { Header } from '@/components/Header';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const OWNER_EMAIL = 'admin@crm.cz';

interface ImportLead {
  firstName: string;
  lastName: string;
  company: string;
  phone: string;
  email?: string;
  notes?: string;
}

// Jednorázový seznam 40 tetovacích salonů (Brno, Praha, Ostrava) k ručnímu
// importu - viz konverzace z 2026-10-01. Po úspěšném importu lze tuhle
// stránku i LEADS pole klidně smazat, slouží jen k jednomu spuštění.
const LEADS: ImportLead[] = [
  // Brno
  { firstName: 'Tattoo Nerd', lastName: 'Tetovací studio', company: 'Tattoo Nerd', phone: '+420773508901', email: 'info@tattoonerd.cz', notes: 'Poštovská 68/3, Brno' },
  { firstName: 'Inkspired Tattoo', lastName: 'Tetovací studio', company: 'Inkspired Tattoo', phone: '+420774100697', email: 'info@inkspired.cz', notes: 'Úvoz 31, Brno' },
  { firstName: 'Our Cult Tattoo', lastName: 'Tetovací studio', company: 'Our Cult Tattoo', phone: '+420739514689', email: 'ourculttattoo@gmail.com', notes: 'Táborská 136/169, Brno' },
  { firstName: 'Tattoo Lexus', lastName: 'Tetovací studio', company: 'Tattoo Lexus', phone: '+420731820448', email: 'tattoolexus@tattoolexus.cz', notes: 'Masarykova 37, Brno-střed' },
  { firstName: 'Plague Tattoo', lastName: 'Tetovací studio', company: 'Plague Tattoo', phone: '+420605932934', email: 'plaguetattoo@email.cz', notes: 'Orlí 482/3, Brno' },
  { firstName: 'Sisters Tattoo', lastName: 'Tetovací studio', company: 'Sisters Tattoo', phone: '+420774302738', email: 'booking@sisterstattoo.cz', notes: 'Turgeněvova 30, Brno-Černovice' },
  { firstName: 'Mysteria Tattoo', lastName: 'Tetovací studio', company: 'Mysteria Tattoo', phone: '+420734141091', email: 'email@mysteria-tattoo.cz', notes: 'Spálená 3, Brno' },
  { firstName: 'Z Tattoo Company', lastName: 'Tetovací studio', company: 'Z Tattoo Company', phone: '+420728856544', email: 'info@ztattoo.cz', notes: 'Křídlovická 11, Brno' },
  { firstName: 'Tattoo Studio Pokojíček', lastName: 'Tetovací studio', company: 'Tattoo Studio Pokojíček', phone: '+420721857345', email: 'pokojicek.studio@gmail.com', notes: 'Sukova 49/4, Brno' },
  { firstName: 'Denor Tattoo Club', lastName: 'Tetovací studio', company: 'Denor Tattoo Club', phone: '+420775912581', email: 'tetujeme@gmail.com', notes: 'Dominikánské náměstí 5/187, Brno' },
  { firstName: 'Tattoo Bar Brno', lastName: 'Tetovací studio', company: 'Tattoo Bar Brno', phone: '+420702900520', email: 'info@tattoobar.cz', notes: 'Pražákova 1008/69, Brno' },
  { firstName: 'Tattoo Dragoon', lastName: 'Tetovací studio', company: 'Tattoo Dragoon', phone: '+420777009973', email: 'tattoodragoon@seznam.cz', notes: 'Opuštěná 4, Brno' },
  { firstName: 'Vean Tattoo Brno', lastName: 'Tetovací studio', company: 'Vean Tattoo', phone: '+420604237666', email: 'marketing.veantattoo@gmail.com', notes: 'Zelný trh 292/11, Brno-Střed' },
  { firstName: 'AG Tattoo Studio', lastName: 'Anežka Gajdošová', company: 'AG Tattoo Studio', phone: '+420773046592', email: 'agstudio@email.cz', notes: 'Masarykova 412/32, Brno' },

  // Praha
  { firstName: 'Praha Tattoo Studio', lastName: 'Tetovací studio', company: 'Praha Tattoo Studio', phone: '+420775058766', email: 'prahatattoostudio@gmail.com', notes: 'Zlatnická 4, Praha 1' },
  { firstName: 'Panter Tattoo', lastName: 'Tetovací studio', company: 'Panter Tattoo', phone: '+420604286095', email: 'pantertattoopraha@seznam.cz', notes: 'Michelská 89/813, Praha 4' },
  { firstName: 'Magic Tattoo', lastName: 'Tetovací studio', company: 'Magic Tattoo', phone: '+420775930300', email: 'ink@magictattoo.cz', notes: 'Bělehradská 93, Praha 2' },
  { firstName: 'Vesna Tattoo', lastName: 'Tetovací studio', company: 'Vesna Tattoo', phone: '+420776497393', email: 'hello@vesnatattoo.com', notes: 'Náměstí Míru 18, Praha 2' },
  { firstName: 'Art Tattoo Alien Prague', lastName: 'Tetovací studio', company: 'Art Tattoo Alien Prague', phone: '+420734744728', email: 'tattooalienprague@gmail.com', notes: 'Jilská 22, Praha 1' },
  { firstName: 'Homie Tattoo Studio', lastName: 'Tetovací studio', company: 'Homie Tattoo Studio', phone: '+420777926123', email: 'info@homietattoo.cz', notes: 'Panská 895/6, Praha 1' },
  { firstName: 'Blue Fox Tattoo', lastName: 'Tetovací studio', company: 'Blue Fox Tattoo', phone: '+420774046449', email: 'bluefoxtattoo@seznam.cz', notes: 'Vodičkova 17, Praha 1' },
  { firstName: 'Icon Tattoo Studio', lastName: 'Tetovací studio', company: 'Icon Tattoo Studio', phone: '+420725024543', email: 'info@icontattoo.cz', notes: 'Jateční 1197/23, Praha 7' },
  { firstName: 'No Name Tattoo & Piercing', lastName: 'Tetovací studio', company: 'No Name Tattoo & Piercing Studio', phone: '+420224949027', email: 'studio@studio-noname.cz', notes: 'Ječná 35, Praha 2' },
  { firstName: 'Black House Tattoo', lastName: 'Tetovací studio', company: 'Black House Tattoo', phone: '+420728274700', email: 'info@blackhousetattoo.cz', notes: 'Zlatnická 1127/4, Praha 1' },
  { firstName: 'Studio Tattoo Mija', lastName: 'Tetovací studio', company: 'Studio Tattoo Mija', phone: '+420607689819', email: 'info@tattoomija.cz', notes: 'Moskevská 54, Praha 10' },
  { firstName: 'Black Rooster Tattoo', lastName: 'Tetovací studio', company: 'Black Rooster Tattoo & Art Studio', phone: '+420732570920', email: 'tereza@blackroosterstudio.com', notes: 'Vratislavova 18/34, Praha 2' },
  { firstName: 'TRIBO Tattoo & Piercing', lastName: 'Tetovací studio', company: 'TRIBO Tattoo & Piercing', phone: '+420736689472', email: 'janackovo@tribo.cz', notes: 'Janáčkovo nábřeží 5, Praha 5' },

  // Ostrava
  { firstName: 'Tattoo Mammoo', lastName: 'Tetovací studio', company: 'Tattoo Mammoo', phone: '+420774584158', email: 'ostravatattoo@seznam.cz', notes: '28. října 1423/297, Ostrava-Hulváky' },
  { firstName: 'LiveAge Ostrava', lastName: 'Tetovací studio', company: 'LiveAge Ostrava', phone: '+420732684320', email: 'studioov@liveage.cz', notes: 'Havlíčkovo nábřeží 21, Ostrava' },
  { firstName: 'Durion Tattoo', lastName: 'Tetovací studio', company: 'Durion Tattoo', phone: '+420730991423', email: 'duriontattoo@gmail.com', notes: '28. října 197/218, Ostrava' },
  { firstName: 'Tetování Ostrava', lastName: 'Tetovací studio', company: 'Tetování Ostrava', phone: '+420731150528', email: 'info@tetovaniostrava.cz', notes: 'Adamusova 1316/2A, Ostrava-Hrabůvka' },
  { firstName: 'Hades Tattoo', lastName: 'Tetovací studio', company: 'Hades Tattoo', phone: '+420777748934', email: 'hadestattoo.info@gmail.com', notes: 'Krmelínská 248/358, Ostrava' },
  { firstName: 'Denek Tattoo', lastName: 'Tetovací studio', company: 'Denek Tattoo', phone: '+420777335232', email: 'info@denektattoo.com', notes: '28. října 1142/168, Ostrava' },
  { firstName: 'Fantasmagoria Art', lastName: 'Martin Kapošváry', company: 'Fantasmagoria Art', phone: '+420732703799', email: 'martin.fantasmagoriaart@gmail.com', notes: 'Karpatská 1122/39, Ostrava-Zábřeh' },
  { firstName: 'Tattoo-Art Ostrava', lastName: 'Tetovací studio', company: 'Tattoo-Art Ostrava', phone: '+420604348518', email: 'tattooartostrava@gmail.com', notes: 'Českobratrská 17/611, Ostrava' },
  { firstName: 'Tattoo Studio Černá Růže', lastName: 'Tetovací studio', company: 'Tattoo Studio Černá Růže', phone: '+420777830006', email: 'info@cernaruzestudio.cz', notes: 'Nádražní 42, Ostrava' },
  { firstName: 'Tetovací Studio DéjàVu', lastName: 'Tetovací studio', company: 'Tetovací Studio DéjàVu', phone: '+420603842659', notes: 'Ostrava-Zábřeh' },
  { firstName: 'VeAn Tattoo & Piercing', lastName: 'Tetovací studio', company: 'VeAn Tattoo & Piercing Studio', phone: '+420737186828', notes: 'Nádražní 27, Ostrava' },
  { firstName: 'Tattoo STYX', lastName: 'Boris Styx', company: 'Tattoo STYX', phone: '+420603953777', email: 'tattoo@boris-styx.cz', notes: 'Sokola Tůmy 1099/1, Ostrava' },
  { firstName: 'Ink by Janet', lastName: 'Tetovací studio', company: 'Ink by Janet', phone: '+420733100939', notes: 'Maďarská 6088/18, Ostrava-Poruba' },
];

type RowResult = { label: string; status: 'pending' | 'ok' | 'error'; message?: string };

export default function BulkImportPage() {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<RowResult[]>([]);

  const isOwner = user?.email === OWNER_EMAIL;

  async function handleImport() {
    if (!user) return;
    setRunning(true);
    setDone(false);
    const initial: RowResult[] = LEADS.map((l) => ({ label: l.company, status: 'pending' }));
    setResults(initial);

    for (let i = 0; i < LEADS.length; i++) {
      const lead = LEADS[i];
      try {
        await api.post('/leads', { ...lead, assignedAgentId: user.id });
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
        <Header title="Import kontaktů" />
        <div className="p-4 md:p-6">
          <div className="rounded-none bg-red-950/40 text-red-400 text-sm px-3 py-2 border border-red-900">
            Tahle stránka je dostupná jen pro vlastníka účtu.
          </div>
        </div>
      </div>
    );
  }

  const okCount = results.filter((r) => r.status === 'ok').length;
  const errorCount = results.filter((r) => r.status === 'error').length;

  return (
    <div>
      <Header title="Import kontaktů - tetovací salony" />
      <div className="p-4 md:p-6 space-y-4">
        <div className="card p-4 space-y-3">
          <p className="text-sm text-slate-600">
            Jednorázový import {LEADS.length} kontaktů na tetovací salony (Brno, Praha, Ostrava) -
            všechny budou přiřazeny tobě ({user?.firstName} {user?.lastName}). Klikni jen jednou,
            opakované spuštění by založilo duplicity.
          </p>
          <button className="btn-primary" onClick={handleImport} disabled={running || done}>
            {running ? `Importuji… (${okCount + errorCount}/${LEADS.length})` : done ? 'Hotovo' : `Importovat ${LEADS.length} kontaktů`}
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
                      {r.status === 'ok' && <span className="text-emerald-600">✓ založeno</span>}
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
            Hotovo: {okCount} založeno, {errorCount} selhalo. Nové leady najdeš v sekci Leady,
            přiřazené na tebe.
          </div>
        )}
      </div>
    </div>
  );
}
