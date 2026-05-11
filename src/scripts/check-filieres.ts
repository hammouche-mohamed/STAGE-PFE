import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const filieres = await prisma.filiere.findMany({ where: { isActive: true } });
  console.log(JSON.stringify(filieres, null, 2));
}
main();
