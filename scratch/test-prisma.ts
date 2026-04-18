import { PrismaClient } from "./src/lib/generated-prisma-final";

const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.notification.count();
    console.log("Notification count:", count);
  } catch (error) {
    console.error("Prisma error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
