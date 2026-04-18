import prisma from '../src/lib/prisma';

async function main() {
  const logo = await prisma.systemSettings.findUnique({
    where: { key: 'universityLogo' }
  });
  console.log('University Logo in DB:', logo);
}

main().catch(console.error).finally(() => prisma.$disconnect());
