import { PrismaClient } from './src/lib/prisma-client-final';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const adapter = new PrismaMariaDb("mysql://root:@127.0.0.1:3307/PFE_esst");
const prisma = new PrismaClient({ adapter });

async function main() {
  const settings = await prisma.systemSettings.findMany();
  console.log(settings);
}

main().catch(console.error).finally(() => prisma.$disconnect());
