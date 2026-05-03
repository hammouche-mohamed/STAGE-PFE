import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(process.env.DATABASE_URL!) });

async function main() {
  // Simulate the internships API for student Yacine
  const yacine = await prisma.user.findUnique({ where: { email: 'yacine@student.dz' }, select: { id: true } });
  console.log('Yacine ID:', yacine?.id);

  const internships = await prisma.internship.findMany({
    where: {
      academicYear: '2024-2025',
      students: { some: { studentId: yacine!.id } }
    },
    select: { id: true, status: true, academicYear: true }
  });
  console.log('\nYacine internships:', internships.length);
  internships.forEach(i => console.log(' -', i.id, `[${i.status}]`, i.academicYear));
}

main().catch(console.error).finally(() => prisma.$disconnect());
