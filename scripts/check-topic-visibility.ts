import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const currentYearSetting = await prisma.systemSettings.findUnique({ where: { key: 'current_academic_year' } });
  console.log("Current Academic Year Setting:", currentYearSetting?.value);

  const topics = await prisma.topic.findMany({
    where: { status: 'OPEN_FOR_SELECTION', internshipType: 'NORMAL' },
    select: { title: true, academicYear: true, targetLevels: true, filiereId: true }
  });
  console.log("OPEN NORMAL Topics:", topics);
}
main().finally(() => prisma.$disconnect());
