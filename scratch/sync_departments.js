const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      teacherProfile: { include: { filiere: true } },
      studentProfile: { include: { filiere: true } },
      adminProfile: { include: { filiere: true } }
    }
  });

  for (const user of users) {
    let filiereName = null;
    if (user.role === 'TEACHER' && user.teacherProfile?.filiere) {
      filiereName = user.teacherProfile.filiere.name;
    } else if (user.role === 'STUDENT' && user.studentProfile?.filiere) {
      filiereName = user.studentProfile.filiere.name;
    } else if (user.role === 'ADMIN' && user.adminProfile?.filiere) {
      filiereName = user.adminProfile.filiere.name;
    }

    if (filiereName && user.department !== filiereName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { department: filiereName }
      });
      console.log(`Updated User ${user.email} department to ${filiereName}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
