import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

async function main() {
  const url = "mysql://root:@127.0.0.1:3307/PFE_esst";
  const adapter = new PrismaMariaDb(url);
  const prisma = new PrismaClient({ adapter });

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: "currentAcademicYear" },
    });
    console.log('SETTING:', JSON.stringify(setting, null, 2));

    const allSettings = await prisma.systemSettings.findMany();
    console.log('ALL_SETTINGS:', JSON.stringify(allSettings, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
