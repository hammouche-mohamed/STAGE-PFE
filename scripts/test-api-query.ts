import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'STUDENT' }, include: { studentprofile: true } });
  if (!user) throw new Error("No student found");

  const filiereFilter = user.studentprofile?.filiereId;
  const studentLevel = user.level;
  console.log("Student:", user.name, "Level:", studentLevel, "Filiere:", filiereFilter);

  const allowedInternshipTypes = ['NORMAL'];
  
  const where: any = {};
  where.OR = [
    { status: 'OPEN_FOR_SELECTION' },
    { proposedById: user.id }
  ];

  where.internshipType = { in: allowedInternshipTypes };
  
  const topics = await prisma.topic.findMany({ where });
  console.log("Topics returned by API:", topics.length);
  
  if (topics.length > 0) {
     console.log("Topics:", topics.map(t => ({ title: t.title, filiereId: t.filiereId })));
  }
}
main().finally(() => prisma.$disconnect());
