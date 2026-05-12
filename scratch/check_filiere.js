const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const request = await prisma.registrationRequest.findUnique({
    where: { email: 'teacher@gmail.com' },
    include: {
      user: {
        include: {
          teacherProfile: true
        }
      }
    }
  });
  console.log(JSON.stringify(request, null, 2));

  const filieres = await prisma.filiere.findMany();
  console.log('Available Filieres:', JSON.stringify(filieres, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
