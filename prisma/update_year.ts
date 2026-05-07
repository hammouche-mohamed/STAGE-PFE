import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

async function main() {
  const url = "mysql://root:@127.0.0.1:3307/PFE_esst";
  const adapter = new PrismaMariaDb(url);
  const prisma = new PrismaClient({ adapter });

  try {
    const updated = await prisma.internship.updateMany({
      where: { academicYear: "2024-2025" },
      data: { academicYear: "2025-2026" }
    });
    console.log(`Updated ${updated.count} internships to 2025-2026`);

    const updatedTopics = await prisma.topic.updateMany({
      where: { academicYear: "2024-2025" },
      data: { academicYear: "2025-2026" }
    });
    console.log(`Updated ${updatedTopics.count} topics to 2025-2026`);

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
