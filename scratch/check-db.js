const { PrismaClient } = require('./src/lib/generated-prisma-final/index.js');

const prisma = new PrismaClient();

async function main() {
  const logo = await prisma.systemSettings.findUnique({
    where: { key: 'universityLogo' }
  });
  console.log('--- DB LOGO RESULT ---');
  console.log(logo);
  console.log('----------------------');
}

main().catch(console.error).finally(() => prisma.$disconnect());
