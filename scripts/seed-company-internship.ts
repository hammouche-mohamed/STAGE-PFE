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

  // 1. Approve the company's topic
  let topic = await prisma.topic.findFirst({
    where: { proposedById: company1.id }
  });

  if (!topic) {
    topic = await prisma.topic.create({
      data: {
        title: `Draft Topic from Company 1`,
        description: "Experimental project idea for industry collaboration.",
        type: "COMPANY_PROPOSED",
        status: "APPROVED",
        academicYear: "2024-2025",
        proposedById: company1.id,
        maxStudents: 2,
        updatedAt: new Date(),
      }
    });
  } else {
    topic = await prisma.topic.update({
      where: { id: topic.id },
      data: { status: "APPROVED" }
    });
  }

  // 2. Find a student
  const student = await prisma.user.findFirst({
    where: { role: 'STUDENT' }
  });

  if (!student) {
    console.log('No student found');
    return;
  }

  const application = await prisma.studentApplication.create({
    data: {
      topicId: topic.id,
      leaderId: student.id,
      status: "ACCEPTED",
      isBinome: false
    }
  });

  // 4. Find a supervisor
  const supervisor = await prisma.user.findFirst({
    where: { role: 'TEACHER' }
  });

  const internship = await prisma.internship.create({
    data: {
      topic: { connect: { id: topic.id } },
      user: { connect: { id: supervisor!.id } },
      academicYear: "2024-2025",
      status: "IN_PROGRESS",
      updatedAt: new Date(),
      internshipstudent: {
        create: [
          { studentId: student.id, isLeader: true }
        ]
      }
    }
  });

  // 6. Create a message
  await prisma.message.create({
    data: {
      internshipId: internship.id,
      senderId: student.id,
      content: "Hello from the student!",
    }
  });

  console.log("Successfully seeded application, internship, and message for Company 1!");
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
