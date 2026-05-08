import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const topics = await prisma.topic.findMany({
    include: { filiere: true }
  });
  console.log("Topics count:", topics.length);
  console.log("Topics with filiere:", topics.filter(t => t.filiereId).length);
  if (topics.length > 0) {
    console.log("First topic:", JSON.stringify(topics[0], null, 2));
  }
}

main().catch(console.error);
