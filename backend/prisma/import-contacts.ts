import { PrismaClient, LeadHistoryAction } from '@prisma/client';

const prisma = new PrismaClient();

// Jednorázový skript: smaže všechny současné (testovací) leady a nahradí je
// reálnými kontakty z Google Sheetu. Spustit jednou přes Start Command na
// Renderu (free tier nemá Shell), pak Start Command vrátit zpět - viz
// DEPLOY_NAVOD.md.

interface RawContact {
  fullName: string; // sloupec "Firma / Klient"
  obor: string;
  region: string;
  phone: string;
  email: string;
  oldWeb: string;
  status: string;
  note: string;
}

const CONTACTS: RawContact[] = [
  {
    fullName: 'Moje pojištění - Petra Růžičková',
    obor: 'Finanční poradce',
    region: 'neuvedeno na webu',
    phone: '733 616 278',
    email: 'moje-pojisteni@seznam.cz',
    oldWeb: 'https://me-pojisteni.webnode.cz/',
    status: 'Draft',
    note: 'Pojišťovací agentka, slabší signál aktivity, preferovat telefon',
  },
  {
    fullName: 'Reality Bezpečně - Miroslav Holý',
    obor: 'Realitní makléř',
    region: 'Vyškovsko / Valašsko',
    phone: '728 606 768',
    email: 'miriholy@seznam.cz',
    oldWeb: 'https://realitybezpecne.webnode.cz/',
    status: 'Odesláno klientovi',
    note: 'Pilotní dávka, RE/MAX afilace',
  },
  {
    fullName: 'Slapské Reality s.r.o. - Jiří Šťastka',
    obor: 'Realitní makléř',
    region: 'Nový Knín / Slapy',
    phone: '603 838 093',
    email: 'jiri.stastka@slapskereality.cz',
    oldWeb: 'https://slapskereality.webnode.cz/',
    status: 'Draft',
    note: 'Zlatý člen Realitní komory ČR, aktuálně 2 nabídky',
  },
  {
    fullName: 'Portál realit - Petr Lacek',
    obor: 'Realitní makléř',
    region: 'Praha, Benešovsko, Posázaví',
    phone: '723 868 688 / 720 315 107',
    email: 'lacek@portal-reality.cz',
    oldWeb: 'https://portal-reality.webnode.cz/',
    status: 'Draft',
    note: 'Aktivní od 2003, ověřená pozitivní reference',
  },
  {
    fullName: 'Nemovitosti Pokorný - Jiří Pokorný',
    obor: 'Realitní makléř',
    region: 'Třebíč / Brandýs n. Labem',
    phone: '607 505 892',
    email: 'pokorny@nemovitosti-pokorny.cz',
    oldWeb: 'https://nemovitost-bez-provize-cz.webnode.cz/',
    status: 'Draft',
    note: 'Aktivní nabídka na webu, IČO 88845893',
  },
  {
    fullName: 'Lenka Kůtková',
    obor: 'Finanční poradkyně',
    region: 'Kamenné Žehrovice / Kladno',
    phone: '737 714 556',
    email: 'l.kutkova@seznam.cz',
    oldWeb: 'https://financnijistoty.webnode.cz/',
    status: 'Draft',
    note: 'Nezávislá, bez vazby na velkou síť',
  },
  {
    fullName: 'FAKT Reality - Tomáš Farský',
    obor: 'Realitní makléř',
    region: 'Ústí nad Labem',
    phone: '608 149 421',
    email: 'faktreality@seznam.cz',
    oldWeb: 'https://faktreality-cz.webnode.cz/',
    status: 'Odesláno klientovi',
    note: 'Pilotní dávka',
  },
  {
    fullName: 'Martin Žilinský',
    obor: 'Finanční poradce (hypotéky)',
    region: 'Zlín',
    phone: '608 522 392',
    email: 'zilinsky.martin@email.cz',
    oldWeb: 'https://hypotecni-poradce.webnode.cz/',
    status: 'Draft',
    note: 'IČ 74867466, minimalistický web',
  },
  {
    fullName: 'ŘEŠ Reality - Martin Řešátko',
    obor: 'Realitní makléř',
    region: 'Dolní Břežany / Praha-západ',
    phone: '774 898 776',
    email: 'martin.resatko@seznam.cz',
    oldWeb: 'https://res-reality.webnode.cz/',
    status: 'Odesláno klientovi',
    note: 'Pilotní dávka',
  },
  {
    fullName: 'Finanční úspory všem - Stanislav a Michal Herout',
    obor: 'Finanční poradce',
    region: 'Tábor / Mladá Boleslav',
    phone: '777 251 167 / 777 789 609',
    email: 'stanislav.herout@post.cz',
    oldWeb: 'https://uspory-vsem.webnode.cz/',
    status: 'Draft',
    note: 'Rodinná dvojice, druhý kontakt Michal Herout (heroutm@seznam.cz)',
  },
  {
    fullName: 'Jitka Horáková',
    obor: 'Finanční poradkyně',
    region: 'celá ČR (bez pevné adresy)',
    phone: '737 514 117',
    email: '',
    oldWeb: 'https://jitka-horakova.webnode.cz/',
    status: 'Draft',
    note: 'E-mail neuveden, preferovat telefon',
  },
  {
    fullName: 'Hruška Reality',
    obor: 'Realitní makléř',
    region: 'Praha 7 - Holešovice',
    phone: '601 133 249',
    email: 'hruska@hruska-reality.cz',
    oldWeb: 'https://hruska-reality.webnode.cz/',
    status: 'Odesláno klientovi',
    note: 'Pilotní dávka',
  },
];

/** Rozdělí "Firma - Jméno Příjmení" na company + firstName/lastName. */
function splitNameCompany(fullName: string): {
  company: string | null;
  firstName: string;
  lastName: string;
} {
  const parts = fullName.split(' - ');
  const personPart = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const company = parts.length > 1 ? parts.slice(0, -1).join(' - ') : null;

  const nameWords = personPart.trim().split(/\s+/);
  if (nameWords.length === 1) {
    // Jednoslovný název (např. "Hruška Reality" bez pomlčky) - rozdělíme na půl,
    // aby v CRM šlo o smysluplné jméno/příjmení.
    return { company, firstName: nameWords[0], lastName: nameWords[0] };
  }
  const lastName = nameWords[nameWords.length - 1];
  const firstName = nameWords.slice(0, -1).join(' ');
  return { company, firstName, lastName };
}

async function main() {
  const agent = await prisma.user.findUnique({ where: { email: 'patrikuba@seznam.cz' } });
  if (!agent) {
    throw new Error('Obchodník patrikuba@seznam.cz (Patrik Kubáník) nebyl nalezen');
  }
  const admin = await prisma.user.findUnique({ where: { email: 'admin@crm.cz' } });
  const actorId = admin?.id ?? agent.id;

  const deleted = await prisma.lead.deleteMany({});
  console.log(`Smazáno současných leadů: ${deleted.count}`);

  for (const c of CONTACTS) {
    const { company, firstName, lastName } = splitNameCompany(c.fullName);
    const primaryPhone = c.phone.split('/')[0].trim();
    const email = c.email || 'neuvedeno@doplnit.cz';

    const notesParts = [
      `Obor: ${c.obor}`,
      `Region: ${c.region}`,
      c.phone.includes('/') ? `Telefon (další kontakt): ${c.phone.split('/').slice(1).join('/').trim()}` : null,
      `Status (import): ${c.status}`,
      `Poznámka: ${c.note}`,
    ].filter(Boolean);

    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        phone: primaryPhone,
        email,
        company: company ?? undefined,
        notes: notesParts.join('\n'),
        oldWebsiteUrl: c.oldWeb,
        assignedAgentId: agent.id,
        lastContactedAt: c.status === 'Odesláno klientovi' ? new Date() : null,
      },
    });

    await prisma.leadHistory.create({
      data: {
        leadId: lead.id,
        actorId,
        action: LeadHistoryAction.CREATED,
        note: 'Importováno z Google Sheetu',
      },
    });

    console.log(`Vytvořen lead: ${firstName} ${lastName} (${company ?? 'bez firmy'})`);
  }

  console.log(`Hotovo, vytvořeno leadů: ${CONTACTS.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
