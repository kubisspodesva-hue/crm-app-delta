import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Jednorázový skript pro přejmenování obchodníků ze seedu.
// Spustit jednou přes Start Command na Renderu (free tier nemá Shell),
// pak Start Command vrátit zpět - viz DEPLOY_NAVOD.md.
async function main() {
  const petr = await prisma.user.update({
    where: { email: 'petr.svoboda@crm.cz' },
    data: { firstName: 'Patrik', lastName: 'Kubáník' },
  });
  console.log('Přejmenován na:', petr.firstName, petr.lastName);

  const lucie = await prisma.user.update({
    where: { email: 'lucie.kralova@crm.cz' },
    data: { firstName: 'Jardáles', lastName: 'Kundáles' },
  });
  console.log('Přejmenována na:', lucie.firstName, lucie.lastName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
