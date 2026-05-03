import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

async function main() {
  // Fix the year mismatch — set both keys to 2024-2025
  await prisma.systemSettings.update({
    where: { key: 'currentAcademicYear' },
    data: { value: '2024-2025', updatedAt: new Date() },
  });
  console.log('✅ Fixed: currentAcademicYear → 2024-2025');

  // Verify
  const k1 = await prisma.systemSettings.findUnique({ where: { key: 'currentAcademicYear' } });
  const k2 = await prisma.systemSettings.findUnique({ where: { key: 'current_academic_year' } });
  console.log('currentAcademicYear   :', k1?.value);
  console.log('current_academic_year :', k2?.value);

  // Confirm topics now match
  const topics = await prisma.topic.findMany({
    where: { academicYear: '2024-2025', status: 'OPEN_FOR_SELECTION' },
    select: { title: true }
  });
  console.log('\nTopics now visible to students:', topics.length);
  topics.forEach(t => console.log(' ✓', t.title));
}

main().catch(console.error).finally(() => prisma.$disconnect());
