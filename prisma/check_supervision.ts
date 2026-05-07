import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

async function main() {
  const url = "mysql://root:@127.0.0.1:3307/PFE_esst";
  const adapter = new PrismaMariaDb(url);
  const prisma = new PrismaClient({ adapter });

  try {
    const internships = await prisma.internship.findMany({
      include: {
        teacher: { select: { id: true, name: true, role: true } },
        students: { include: { student: { select: { name: true } } } },
        _count: { select: { documents: true } }
      }
    });

    console.log('INTERNSHIPS:', JSON.stringify(internships, null, 2));

    const documents = await prisma.document.findMany({
      take: 5,
      select: { id: true, fileName: true, uploadedById: true, internshipId: true }
    });
    console.log('SAMPLE_DOCUMENTS:', JSON.stringify(documents, null, 2));

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
