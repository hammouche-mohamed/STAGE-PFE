const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacher = await prisma.user.findUnique({
    where: { email: 'teacher@gmail.com' },
    include: {
      teacherProfile: {
        include: {
          filiere: true
        }
      }
    }
  });
  console.log(JSON.stringify(teacher, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
