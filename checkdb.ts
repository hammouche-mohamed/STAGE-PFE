import { PrismaClient } from './src/lib/prisma-client-final';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSettings.findMany();
  console.log(settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
