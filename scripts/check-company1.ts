import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const company1 = await prisma.user.findFirst({
    where: { name: 'Company 1', role: 'COMPANY' }
  });

  if (!company1) {
    console.log('Company 1 not found');
    return;
  }

  console.log(`Found Company 1: ${company1.id}`);

  // Check topics proposed by Company 1
  const topics = await prisma.topic.findMany({
    where: { proposedById: company1.id }
  });
  console.log(`Topics proposed by Company 1: ${topics.length}`);

  // Check applications for these topics
  const applications = await prisma.studentApplication.findMany({
    where: { topic: { proposedById: company1.id } }
  });
  console.log(`Applications for Company 1 topics: ${applications.length}`);

  // Check internships derived from these topics
  const internships = await prisma.internship.findMany({
    where: { topic: { proposedById: company1.id } }
  });
  console.log(`Internships for Company 1 topics: ${internships.length}`);

  // Check messages for these internships
  const messages = await prisma.message.findMany({
    where: { internship: { topic: { proposedById: company1.id } } }
  });
  console.log(`Messages for Company 1 internships: ${messages.length}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
