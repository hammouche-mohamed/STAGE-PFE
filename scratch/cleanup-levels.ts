
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up levels for companies...');
  
  const result = await prisma.user.updateMany({
    where: {
      role: 'COMPANY',
      level: { not: null }
    },
    data: {
      level: null
    }
  });
  
  console.log(`Updated ${result.count} company users.`);
  
  // Also clean up teachers just in case
  const teacherResult = await prisma.user.updateMany({
    where: {
      role: 'TEACHER',
      level: { not: null }
    },
    data: {
      level: null
    }
  });
  
  console.log(`Updated ${teacherResult.count} teacher users.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
