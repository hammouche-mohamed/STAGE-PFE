const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Fix Teachers
  const teachers = await prisma.teacherProfile.findMany({
    where: { filiereId: null },
    include: { user: true }
  });
  
  for (const tp of teachers) {
    if (tp.speciality) {
      const filiere = await prisma.filiere.findFirst({ where: { name: tp.speciality } });
      if (filiere) {
        await prisma.teacherProfile.update({
          where: { id: tp.id },
          data: { filiereId: filiere.id }
        });
        console.log(`Updated Teacher ${tp.user.email}: ${filiere.name}`);
      }
    }
  }

  // Fix Students
  const students = await prisma.studentProfile.findMany({
    where: { filiereId: null },
    include: { user: true }
  });

  for (const sp of students) {
    if (sp.speciality && sp.speciality !== 'N/A') {
      const filiere = await prisma.filiere.findFirst({ where: { name: sp.speciality } });
      if (filiere) {
        await prisma.studentProfile.update({
          where: { id: sp.id },
          data: { filiereId: filiere.id }
        });
        console.log(`Updated Student ${sp.user.email}: ${filiere.name}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
