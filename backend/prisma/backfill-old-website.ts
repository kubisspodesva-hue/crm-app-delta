import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Jednorázový skript: pole "Zdroj" bylo přejmenováno na "Odkaz na starý web"
// (nové pole oldWebsiteUrl). U leadů naimportovaných dřív (viz import-contacts.ts)
// byl "starý web" jen textem uvnitř poznámky ("Starý web: https://..."). Tenhle
// skript tu hodnotu z poznámky přečte a přesune do nového pole, u leadů, které
// oldWebsiteUrl ještě nemají.

async function main() {
  const leads = await prisma.lead.findMany({
    where: { oldWebsiteUrl: null, notes: { contains: 'Starý web:' } },
  });

  console.log(`Nalezeno leadů k doplnění: ${leads.length}`);

  for (const lead of leads) {
    const match = lead.notes?.match(/Starý web:\s*(\S+)/);
    if (!match) continue;
    const url = match[1];

    const newNotes = lead.notes?.replace(/\n?Starý web:\s*\S+/, '').trim() ?? null;

    await prisma.lead.update({
      where: { id: lead.id },
      data: { oldWebsiteUrl: url, notes: newNotes },
    });

    console.log(`Doplněno: ${lead.firstName} ${lead.lastName} -> ${url}`);
  }

  console.log('Hotovo, backfill dokoncen.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
