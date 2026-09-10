import { PrismaClient, Role, LeadStatus, CommissionType, TargetPeriod, TargetMetric } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Heslo123!', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@crm.cz' },
    update: {},
    create: {
      email: 'admin@crm.cz',
      passwordHash,
      firstName: 'Jana',
      lastName: 'Nováková',
      role: Role.ADMIN,
    },
  });

  const agent1 = await prisma.user.upsert({
    where: { email: 'petr.svoboda@crm.cz' },
    update: {},
    create: {
      email: 'petr.svoboda@crm.cz',
      passwordHash,
      firstName: 'Petr',
      lastName: 'Svoboda',
      role: Role.AGENT,
    },
  });

  const agent2 = await prisma.user.upsert({
    where: { email: 'lucie.kralova@crm.cz' },
    update: {},
    create: {
      email: 'lucie.kralova@crm.cz',
      passwordHash,
      firstName: 'Lucie',
      lastName: 'Králová',
      role: Role.AGENT,
    },
  });

  await prisma.commissionConfig.upsert({
    where: { userId: agent1.id },
    update: {},
    create: { userId: agent1.id, type: CommissionType.PERCENTAGE, percentage: 8 },
  });

  await prisma.commissionConfig.upsert({
    where: { userId: agent2.id },
    update: {},
    create: { userId: agent2.id, type: CommissionType.FIXED_PER_SALE, fixedAmount: 1500 },
  });

  await prisma.target.createMany({
    data: [
      { userId: agent1.id, period: TargetPeriod.WEEKLY, metric: TargetMetric.CONTACTS, value: 100 },
      { userId: agent1.id, period: TargetPeriod.WEEKLY, metric: TargetMetric.MEETINGS, value: 15 },
      { userId: agent1.id, period: TargetPeriod.WEEKLY, metric: TargetMetric.SALES, value: 5 },
      { userId: agent2.id, period: TargetPeriod.WEEKLY, metric: TargetMetric.CONTACTS, value: 80 },
      { userId: agent2.id, period: TargetPeriod.WEEKLY, metric: TargetMetric.SALES, value: 4 },
    ],
    skipDuplicates: true,
  });

  const existingLeadCount = await prisma.lead.count();

  if (existingLeadCount === 0) {
    const sampleLeads = [
      { firstName: 'Tomáš', lastName: 'Dvořák', phone: '+420601111111', email: 'tomas.dvorak@example.com', oldWebsiteUrl: 'https://priklad-web1.webnode.cz/', agent: agent1.id, status: LeadStatus.IN_PROGRESS },
      { firstName: 'Eva', lastName: 'Procházková', phone: '+420602222222', email: 'eva.p@example.com', oldWebsiteUrl: null, agent: agent1.id, status: LeadStatus.MEETING_SCHEDULED },
      { firstName: 'Jan', lastName: 'Novák', phone: '+420603333333', email: 'jan.novak@example.com', oldWebsiteUrl: 'https://priklad-web2.webnode.cz/', agent: agent2.id, status: LeadStatus.SOLD },
      { firstName: 'Marie', lastName: 'Veselá', phone: '+420604444444', email: 'marie.vesela@example.com', oldWebsiteUrl: null, agent: agent2.id, status: LeadStatus.REJECTED },
    ];

    for (const l of sampleLeads) {
      const lead = await prisma.lead.create({
        data: {
          firstName: l.firstName,
          lastName: l.lastName,
          phone: l.phone,
          email: l.email,
          oldWebsiteUrl: l.oldWebsiteUrl,
          assignedAgentId: l.agent,
          status: l.status,
          dealValue: l.status === LeadStatus.SOLD ? 45000 : null,
          soldAt: l.status === LeadStatus.SOLD ? new Date() : null,
          rejectedAt: l.status === LeadStatus.REJECTED ? new Date() : null,
        },
      });

      await prisma.leadHistory.create({
        data: {
          leadId: lead.id,
          actorId: l.agent,
          action: 'CREATED',
          note: 'Lead vytvořen (seed data)',
        },
      });
    }
  }

  console.log('Seed dokončen.');
  console.log('Přihlašovací údaje (heslo pro všechny): Heslo123!');
  console.log(`Admin: ${admin.email}`);
  console.log(`Agent 1: ${agent1.email}`);
  console.log(`Agent 2: ${agent2.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
