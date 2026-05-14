import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const counts = await prisma.topic.groupBy({ by: ['status', 'internshipType'], _count: true });
  console.log("Topic Counts:", counts);
}
main().finally(() => prisma.$disconnect());
