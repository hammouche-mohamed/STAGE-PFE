import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

async function main() {
  const url = "mysql://root:@127.0.0.1:3307/PFE_esst";
  const adapter = new PrismaMariaDb(url);
  const prisma = new PrismaClient({ adapter });

  try {
    const topics = await prisma.topic.findMany({
      include: {
        proposedBy: {
          select: { role: true }
        }
      }
    });

    const counts = topics.reduce((acc, topic) => {
      const role = topic.proposedBy.role;
      acc[role] = (acc[role] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('TOPIC_COUNTS_BY_ROLE:', JSON.stringify(counts, null, 2));
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
