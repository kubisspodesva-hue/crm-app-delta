import {
  PrismaClient,
  Role,
  CommissionType,
  TargetPeriod,
  TargetMetric,
  LeadHistoryAction,
  LeadStatus,
} from '@prisma/client';

const prisma = new PrismaClient();

// Jednorázový skript: nastaví všem aktivním obchodníkům (Role.AGENT, isActive)
// provizi 20 % z hodnoty obchodu a měsíční cíle na srpen: prodeje, a k nim
// dopočítané potřebné hovory (kontakty) a domluvené schůzky/cally.
//
// Matematika prodejů (zadaná Kubissem): provize 20 % z průměrné ceny webu
// 30 000 Kč = 6 000 Kč za prodej. 9 prodejů x 6 000 Kč = 54 000 Kč, tedy nad
// cílem "vydělat i 50 000 Kč" (8 prodejů by bylo jen 48 000 Kč, těsně pod).
//
// Matematika hovorů/schůzek: postavená na stejné logice jako v
// TargetsService.getPrediction (successRate = historické prodeje / historické
// kontakty). Tady navíc rozpadáme funnel na dva kroky - kontakt -> schůzka ->
// prodej - ať jde nastavit i cíl počtu schůzek, ne jen kontaktů. Pro obchodníky
// bez dostatečné historie (noví, nebo zatím málo hovorů/schůzek) použijeme
// rozumný výchozí odhad konverze místo nespolehlivého poměru z pár čísel.

const COMMISSION_PERCENTAGE = 20;
const MONTHLY_SALES_TARGET = 9;

// Výchozí odhad konverze (použije se, když obchodník nemá dost vlastní historie)
const DEFAULT_CONTACT_TO_MEETING_RATE = 0.2; // cca 1 z 5 hovorů vede ke schůzce
const DEFAULT_MEETING_TO_SALE_RATE = 1 / 3; // cca 1 ze 3 schůzek vede k prodeji

// Minimální vzorek dat, od kterého už důvěřujeme vlastní historii obchodníka
const MIN_CONTACTS_SAMPLE = 10;
const MIN_MEETINGS_SAMPLE = 3;

async function main() {
  const agents = await prisma.user.findMany({
    where: { role: Role.AGENT, isActive: true },
  });

  console.log(`Nalezeno aktivních obchodníků: ${agents.length}`);

  for (const agent of agents) {
    // --- provize (nezávisle na cílech) ---
    await prisma.commissionConfig.upsert({
      where: { userId: agent.id },
      create: { userId: agent.id, type: CommissionType.PERCENTAGE, percentage: COMMISSION_PERCENTAGE },
      update: { type: CommissionType.PERCENTAGE, percentage: COMMISSION_PERCENTAGE },
    });

    // --- historická data pro dopočet funnelu (celoživotně, ne jen srpen) ---
    const [totalContacts, totalMeetings, totalSales] = await Promise.all([
      prisma.leadHistory.count({
        where: { action: LeadHistoryAction.CONTACTED, lead: { assignedAgentId: agent.id } },
      }),
      prisma.meeting.count({ where: { agentId: agent.id } }),
      prisma.lead.count({ where: { assignedAgentId: agent.id, status: LeadStatus.SOLD } }),
    ]);

    const contactToMeetingRate =
      totalContacts >= MIN_CONTACTS_SAMPLE && totalMeetings > 0
        ? totalMeetings / totalContacts
        : DEFAULT_CONTACT_TO_MEETING_RATE;

    const meetingToSaleRate =
      totalMeetings >= MIN_MEETINGS_SAMPLE && totalSales > 0
        ? totalSales / totalMeetings
        : DEFAULT_MEETING_TO_SALE_RATE;

    const neededMeetings = Math.ceil(MONTHLY_SALES_TARGET / meetingToSaleRate);
    const neededContacts = Math.ceil(neededMeetings / contactToMeetingRate);

    // --- zápis cílů (SALES, MEETINGS, CONTACTS) - nahrazuje předchozí stejného typu ---
    const targets: Array<{ metric: TargetMetric; value: number }> = [
      { metric: TargetMetric.SALES, value: MONTHLY_SALES_TARGET },
      { metric: TargetMetric.MEETINGS, value: neededMeetings },
      { metric: TargetMetric.CONTACTS, value: neededContacts },
    ];

    for (const t of targets) {
      await prisma.target.deleteMany({
        where: { userId: agent.id, period: TargetPeriod.MONTHLY, metric: t.metric },
      });
      await prisma.target.create({
        data: { userId: agent.id, period: TargetPeriod.MONTHLY, metric: t.metric, value: t.value },
      });
    }

    const usedOwnData = totalContacts >= MIN_CONTACTS_SAMPLE && totalMeetings >= MIN_MEETINGS_SAMPLE;
    console.log(
      `Nastaveno: ${agent.firstName} ${agent.lastName} -> provize ${COMMISSION_PERCENTAGE}%, ` +
        `cíl srpen: ${MONTHLY_SALES_TARGET} prodejů / ${neededMeetings} schůzek / ${neededContacts} hovorů ` +
        `(${usedOwnData ? 'z vlastní historie' : 'odhad podle výchozí konverze - zatím málo dat'})`,
    );
  }

  console.log('Hotovo, cíle a provize na srpen nastaveny.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
