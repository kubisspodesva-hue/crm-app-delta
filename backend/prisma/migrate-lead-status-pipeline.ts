import { PrismaClient, LeadStatus } from '@prisma/client';

const prisma = new PrismaClient();

// Jednorázový migrační skript (fáze 1 z 2) pro přechod ze starého 4stavového
// statusu leadu na nový 8stavový obchodní pipeline (2026-08 redesign).
//
// Mapování starý -> nový stav:
//   IN_PROGRESS       -> CONTACTED (pokud byl lead kdy kontaktován, tj. má
//                        lastContactedAt) jinak NEW (ještě se s ním nikdo
//                        nebavil - typicky čerstvě naimportovaný lead)
//   MEETING_SCHEDULED -> NEGOTIATION (má domluvenou schůzku, tedy je
//                        v pokročilé fázi jednání)
//   SOLD              -> WON
//   REJECTED          -> LOST
//
// Staré hodnoty enumu (IN_PROGRESS/MEETING_SCHEDULED/SOLD/REJECTED) zůstávají
// v schema.prisma dočasně definované, aby push nespadl na existujících
// řádcích, dokud tenhle skript neproběhne. Po úspěšném běhu na produkci se
// v samostatném commitu (fáze 2) tyhle staré hodnoty z enumu odstraní.

const MAPPING: Record<string, LeadStatus | 'CONTACTED_OR_NEW'> = {
  IN_PROGRESS: 'CONTACTED_OR_NEW',
  MEETING_SCHEDULED: LeadStatus.NEGOTIATION,
  SOLD: LeadStatus.WON,
  REJECTED: LeadStatus.LOST,
};

async function main() {
  let totalUpdated = 0;

  for (const oldStatus of ['IN_PROGRESS', 'MEETING_SCHEDULED', 'SOLD', 'REJECTED'] as const) {
    const target = MAPPING[oldStatus];

    if (target === 'CONTACTED_OR_NEW') {
      const withContact = await prisma.lead.updateMany({
        where: { status: oldStatus as LeadStatus, lastContactedAt: { not: null } },
        data: { status: LeadStatus.CONTACTED },
      });
      const withoutContact = await prisma.lead.updateMany({
        where: { status: oldStatus as LeadStatus, lastContactedAt: null },
        data: { status: LeadStatus.NEW },
      });
      console.log(
        `${oldStatus}: ${withContact.count} -> CONTACTED, ${withoutContact.count} -> NEW`,
      );
      totalUpdated += withContact.count + withoutContact.count;
    } else {
      const result = await prisma.lead.updateMany({
        where: { status: oldStatus as LeadStatus },
        data: { status: target },
      });
      console.log(`${oldStatus}: ${result.count} -> ${target}`);
      totalUpdated += result.count;
    }
  }

  console.log(`Hotovo, celkem přemigrováno leadů: ${totalUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
