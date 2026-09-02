import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Jednorázový skript pro přejmenování admin účtu.
// Spustit jednou přes Start Command na Renderu (free tier nemá Shell),
// pak Start Command vrátit zpět - viz DEPLOY_NAVOD.md.
async function main() {
  const updated = await prisma.user.update({
    where: { email: 'admin@crm.cz' },
    data: {
      firstName: 'Kubi$$',
      lastName: '',
    },
  });
  console.log('Admin přejmenován na:', updated.firstName, updated.lastName);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
