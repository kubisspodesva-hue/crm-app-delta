'use client';

import { useState } from 'react';

const NOTE_TEMPLATE = `Co teď používá/doporučuje:
Orientační počet tetování/měsíc:
Reakce na nabídku vlastní značky (zájem / neutrální / odmítl):
Domluvený termín s Alexem:
Poznámka:`;

export function CallScriptCard({ onInsertTemplate }: { onInsertTemplate: (template: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="card p-5">
      <button
        className="w-full flex items-center justify-between font-semibold text-slate-800"
        onClick={() => setOpen((v) => !v)}
      >
        <span>📞 Scénář hovoru – péče po tetování</span>
        <span className="text-slate-400 text-sm">{open ? 'Skrýt' : 'Zobrazit'}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-medium text-slate-800">1. Otevření</p>
            <p>
              „Dobrý den, [jméno] z Delta Innovations. Máte minutku? Volám ohledně péče po
              tetování ve vašem studiu.“
            </p>
          </div>

          <div>
            <p className="font-medium text-slate-800">2. Qualifying otázky</p>
            <p>
              „Doporučujete teď klientům po tetování nějaký konkrétní krém/balzám, nebo si každý
              kupuje, co chce?“
            </p>
            <p>
              „A pro orientaci – kolik tetování měsíčně u vás zhruba děláte?“{' '}
              <span className="text-slate-500">
                (důležité pro Alexe kvůli minimálnímu odběru)
              </span>
            </p>
          </div>

          <div>
            <p className="font-medium text-slate-800">3. Vzbuzení zájmu</p>
            <p>
              „A co kdyby to byl balzám s logem vašeho studia, co prodáváte přímo na pokladně po
              tetování? Žádná práce navíc pro vás, jen extra tržba a klienti si vás nosí domů v
              kabelce. Spoustu studií tohle řešíme přes nás – my ho vyrobíme, vy ho prodáváte pod
              svou značkou. Chcete vědět, jak by to u vás reálně vypadalo?“
            </p>
          </div>

          <div>
            <p className="font-medium text-slate-800">4. Časté námitky</p>
            <ul className="space-y-2 list-disc list-inside">
              <li>
                <span className="italic">„Kolik by to stálo?“</span> → „To záleží na množství a
                složení, to přesně probere Alex, náš společník, co dělá nacenění na míru – neházel
                bych vám teď obecné číslo, který by stejně neplatilo.“
              </li>
              <li>
                <span className="italic">„To je asi malý salon na takovéhle množství.“</span> →
                „Rozumím, to je jedna z věcí, co se dá řešit případ od případu – třeba spojením
                víc menších studií do jedné dávky, pokud by to dávalo smysl. Přesně tohle vám
                vysvětlí Alex na hovoru.“
              </li>
              <li>
                <span className="italic">„Nemáte certifikát GMP/HACCP?“</span> → „Certifikát
                zatím nemáme, ale výrobu řídíme přesně podle těchto standardů – detaily zas lépe
                vysvětlí Alex.“
              </li>
              <li>
                <span className="italic">„Nemám teď čas.“</span> → „Žádný stres, stačí 15 minut,
                kdy vám Alex ukáže, jak by produkt mohl vypadat. Pátek, nebo příští týden?“
              </li>
              <li>
                <span className="italic">„Vůbec nás to nezajímá, neprodáváme žádné produkty.“</span>{' '}
                → Poděkovat, nenaléhat, nenabízet schůzku. „Rozumím, díky za čas. Kdyby se to
                časem změnilo, dejte vědět.“ V CRM označit jako <b>Nemá zájem</b>, ať se sem
                zbytečně nevoláte znovu.
              </li>
            </ul>
          </div>

          <div>
            <p className="font-medium text-slate-800">5. Uzavření</p>
            <p>
              „Super, domluvím vám krátký hovor s Alexem, co se specializuje přesně na tohle.
              Vyhovovalo by spíš [den A] nebo [den B]?“
            </p>
            <p className="text-slate-500">
              Pokud chce jen info mailem: „Pošlu, a rovnou se ozvu za týden, ať to nezapadne.“
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100">
            <button
              className="btn-secondary text-sm"
              onClick={() => onInsertTemplate(NOTE_TEMPLATE)}
            >
              Vložit šablonu poznámky pro Alexe
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
