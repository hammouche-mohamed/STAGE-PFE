const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const teacherEmail = 'teacher@gmail.com';
  
  // 1. Get the teacher profile and user
  const user = await prisma.user.findUnique({
    where: { email: teacherEmail },
    include: { teacherProfile: true }
  });

  if (!user || !user.teacherProfile) {
    console.log('Teacher not found');
    return;
  }

  // 2. Find the filiere by name (from speciality)
  const speciality = user.teacherProfile.speciality;
  if (!speciality) {
    console.log('No speciality set for teacher');
    return;
  }

  const filiere = await prisma.filiere.findFirst({
    where: { name: speciality }
  });

  if (!filiere) {
    console.log(`Filiere not found for speciality: ${speciality}`);
    return;
  }

  // 3. Update the teacher profile
  await prisma.teacherProfile.update({
    where: { id: user.teacherProfile.id },
    data: { filiereId: filiere.id }
  });

  console.log(`Updated teacher ${teacherEmail} with filiere ${filiere.name} (${filiere.id})`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
