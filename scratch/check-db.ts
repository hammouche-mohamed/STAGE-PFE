import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const filieres = await prisma.filiere.findMany();
  console.log("Filieres:", JSON.stringify(filieres, null, 2));

  const students = await prisma.studentProfile.findMany({
    take: 5,
    include: { user: { select: { name: true, email: true } } }
  });
  console.log("Students:", JSON.stringify(students, null, 2));
}

main().catch(console.error);
