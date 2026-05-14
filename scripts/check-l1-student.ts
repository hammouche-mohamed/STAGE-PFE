import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({ where: { role: 'STUDENT', level: 'L1' }, include: { studentprofile: true } });
  console.log("L1 Student profile:", users[0]?.studentprofile);
}
main().finally(() => prisma.$disconnect());
