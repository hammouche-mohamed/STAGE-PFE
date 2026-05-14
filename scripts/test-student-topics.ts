import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'STUDENT', level: 'L1' } });
  
  const completedInternships = await prisma.internship.findMany({
    where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
    select: { topicId: true }
  });
  const completedTopicIds = completedInternships.map(i => i.topicId);
  
  const currentYearSetting = await prisma.systemSettings.findUnique({ where: { key: 'current_academic_year' } });
  const academicYear = currentYearSetting?.value || 'N/A';
  
  const where: any = {};
  if (completedTopicIds.length > 0) {
    where.id = { notIn: completedTopicIds };
  }
  
  if (academicYear !== 'N/A') where.academicYear = academicYear;
  
  where.OR = [
    { status: 'OPEN_FOR_SELECTION' },
    { proposedById: user!.id }
  ];
  
  where.internshipType = { in: ['NORMAL'] };
  
  console.log("FINAL WHERE:", JSON.stringify(where, null, 2));
  
  const topics = await prisma.topic.findMany({ where, select: { title: true, status: true, internshipType: true } });
  console.log("Returned Topics:", topics.length, topics);
}
main().finally(() => prisma.$disconnect());
