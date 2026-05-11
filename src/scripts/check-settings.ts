import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const settings = await prisma.systemSettings.findMany();
  console.log(JSON.stringify(settings, null, 2));
}
main();
