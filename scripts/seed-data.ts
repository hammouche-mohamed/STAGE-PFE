import { PrismaClient, user_role, topic_type, topic_status, registrationrequest_role, registrationrequest_status, internship_status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const archiveYear = "2024-2025";
  const currentYear = "2025-2026";
  const levels = ["L1", "L2", "L3", "M1", "M2"];
  const passwordHashes = {
    student: await bcrypt.hash("studentstudent12", 10),
    supervisor: await bcrypt.hash("supervisorsupervisor12", 10),
    company: await bcrypt.hash("companycompany12", 10),
    admin: await bcrypt.hash("adminadmin12", 10),
  };

  console.log("Cleaning database...");
  const models = [
    "auditLog", "messageRead", "message", "document", "internshipStudent", "internship",
    "studentApplication", "teacherApplication", "validation", "topic", "binomeInvitation",
    "teamInvitation", "teamMember", "studentTeam", "notification", "passwordResetToken",
    "registrationRequest", "deadline", "studentProfile", "teacherProfile", "companyProfile",
    "adminProfile", "user", "filiere", "loginAttempt", "systemSettings"
  ];

  for (const model of models) {
    try {
      // @ts-ignore
      await prisma[model].deleteMany();
    } catch (e) {
      console.log(`Skipping deletion for ${model}`);
    }
  }

  console.log("Setting system configurations...");
  await (prisma.systemSettings as any).createMany({
    data: [
      { key: "currentAcademicYear", value: currentYear, updatedAt: new Date() },
      { key: "availablePromotions", value: "L1,L2,L3,M1,M2", updatedAt: new Date() },
      { key: "registrationOpen", value: "true", updatedAt: new Date() }
    ]
  });

  console.log("Creating departments...");
  const depts = [
    { name: "Computer Science", code: "CS" },
    { name: "Chemistry", code: "CH" },
    { name: "Electronics", code: "EL" },
    { name: "E-commerce", code: "EC" },
  ];

  const createdDepts = [];
  for (const dept of depts) {
    const d = await (prisma.filiere as any).create({ data: dept });
    createdDepts.push(d);
  }

  console.log("Creating companies...");
  const companies = [];
  for (let i = 1; i <= 3; i++) {
    const user = await (prisma.user as any).create({
      data: {
        name: `Company ${i}`,
        email: `company${i}@gmail.com`,
        password: passwordHashes.company,
        role: "COMPANY",
        isActive: true,
        mustChangePassword: false,
        companyprofile: {
          create: {
            companyName: `Company ${i} SARL`,
            sector: "Technology",
            address: `Zone Industrielle ${i}`,
            wilaya: "Algiers",
          }
        }
      }
    });
    companies.push(user);
  }

  console.log("Creating admins...");
  // Super Admin
  const superAdmin = await (prisma.user as any).create({
    data: {
      name: "hammouche mohamed",
      email: "kalomino.2006@gmail.com",
      password: passwordHashes.admin,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      adminprofile: { create: { isSuperAdmin: true } }
    }
  });

  // Dept Admins
  for (let i = 0; i < createdDepts.length; i++) {
    await (prisma.user as any).create({
      data: {
        name: `Admin ${createdDepts[i].name}`,
        email: `admin${i + 1}@gmail.com`,
        password: passwordHashes.admin,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
        adminprofile: { create: { filiereId: createdDepts[i].id, isSuperAdmin: false } }
      }
    });
  }

  console.log("Creating supervisors...");
  const supervisors = [];
  for (let i = 0; i < createdDepts.length; i++) {
    const user = await (prisma.user as any).create({
      data: {
        name: `Supervisor ${i+1}`,
        email: `supervisor${i+1}@gmail.com`,
        password: passwordHashes.supervisor,
        role: "TEACHER",
        isActive: true,
        mustChangePassword: false,
        teacherprofile: {
          create: {
            filiereId: createdDepts[i].id,
            grade: "Maitre de Conferences",
            speciality: createdDepts[i].name,
          }
        }
      }
    });
    supervisors.push(user);
  }

  console.log("Creating students...");
  const students = [];
  for (let i = 0; i < createdDepts.length; i++) {
    for (let j = 1; j <= 8; j++) {
      const idx = i * 8 + j;
      const level = levels[j % levels.length];
      const user = await (prisma.user as any).create({
        data: {
          name: `Student ${idx}`,
          email: `student${idx}@gmail.com`,
          password: passwordHashes.student,
          role: "STUDENT",
          isActive: true,
          mustChangePassword: false,
          level: level,
          studentprofile: {
            create: {
              filiereId: createdDepts[i].id,
              studentId: `ST${idx.toString().padStart(4, '0')}`,
              promotion: "2025",
              speciality: createdDepts[i].name,
              academicYear: idx > 15 ? currentYear : archiveYear,
              level: level,
            }
          }
        }
      });
      students.push(user);
    }
  }

  // ── ARCHIVE DATA (2024-2025) ────────────────────────────────────────────────
  console.log("Generating Archive Data (2024-2025)...");
  
  for (let i = 0; i < 5; i++) {
    const leader = students[i];
    const supervisor = supervisors[i % supervisors.length];
    
    // Create a finished internship
    const topic = await (prisma.topic as any).create({
      data: {
        title: `Archived Project ${i + 1}`,
        description: "Historical project for archive visibility.",
        type: "COMPANY_PROPOSED",
        status: "TAKEN",
        academicYear: archiveYear,
        proposedById: companies[0].id,
        filiereId: createdDepts[0].id,
        maxStudents: 1,
        updatedAt: new Date(),
      }
    });

    const internship = await (prisma.internship as any).create({
      data: {
        topicId: topic.id,
        teacherId: supervisor.id,
        academicYear: archiveYear,
        status: "COMPLETED",
        internshipType: "PFE",
        completedAt: new Date(`${archiveYear.split('-')[1]}-06-15`),
        internshipstudent: { create: [{ studentId: leader.id, isLeader: true }] },
        updatedAt: new Date(),
      }
    });

    // Add some archive documents
    await (prisma.document as any).create({
      data: {
        internshipId: internship.id,
        uploadedById: leader.id,
        type: "FINAL_REPORT",
        fileName: `Final_Report_v1.pdf`,
        fileUrl: "https://example.com/file.pdf",
        fileSize: 1024 * 1024,
        status: "APPROVED",
        uploadedAt: new Date(`${archiveYear.split('-')[1]}-06-10`),
      }
    });

    // Add some archive messages
    await (prisma.message as any).create({
      data: {
        internshipId: internship.id,
        senderId: supervisor.id,
        content: "Excellent work on the final report.",
        sentAt: new Date(`${archiveYear.split('-')[1]}-06-12`),
      }
    });
  }

  // ── CURRENT DATA (2025-2026) ────────────────────────────────────────────────
  console.log("Generating Current Data (2025-2026)...");
  
  for (let i = 15; i < 20; i++) {
    const leader = students[i];
    const supervisor = supervisors[i % supervisors.length];

    const topic = await (prisma.topic as any).create({
      data: {
        title: `Active Research ${i - 14}`,
        description: "Current ongoing research topic.",
        type: "STUDENT_PROPOSED",
        status: "TAKEN",
        academicYear: currentYear,
        proposedById: leader.id,
        filiereId: createdDepts[i % createdDepts.length].id,
        maxStudents: 1,
        updatedAt: new Date(),
      }
    });

    await (prisma.internship as any).create({
      data: {
        topicId: topic.id,
        teacherId: supervisor.id,
        academicYear: currentYear,
        status: "IN_PROGRESS",
        internshipType: "NORMAL",
        internshipstudent: { create: [{ studentId: leader.id, isLeader: true }] },
        updatedAt: new Date(),
      }
    });
  }

  // Some pending topics for current year
  for (let i = 0; i < 3; i++) {
    await (prisma.topic as any).create({
      data: {
        title: `Pending Industry Topic ${i + 1}`,
        description: "New proposal for the current year.",
        type: "COMPANY_PROPOSED",
        status: "PENDING_ADMIN",
        academicYear: currentYear,
        proposedById: companies[1].id,
        filiereId: createdDepts[1].id,
        maxStudents: 2,
        updatedAt: new Date(),
      }
    });
  }

  // ── AUDIT LOGS ──────────────────────────────────────────────────────────────
  console.log("Creating Audit Logs...");
  // Logs for archive year
  await (prisma.auditLog as any).createMany({
    data: [
      {
        userId: superAdmin.id,
        action: "INTERNSHIP_COMPLETED",
        targetType: "Internship",
        targetId: "archive-1",
        createdAt: new Date(`${archiveYear.split('-')[1]}-06-15`),
      },
      {
        userId: superAdmin.id,
        action: "TOPIC_APPROVED",
        targetType: "Topic",
        targetId: "archive-2",
        createdAt: new Date(`${archiveYear.split('-')[0]}-10-20`),
      }
    ]
  });

  // Logs for current year
  await (prisma.auditLog as any).createMany({
    data: [
      {
        userId: superAdmin.id,
        action: "SYSTEM_SETTING_UPDATED",
        targetType: "SystemSettings",
        targetId: "year",
        createdAt: new Date(),
      },
      {
        userId: superAdmin.id,
        action: "TOPIC_SUBMITTED",
        targetType: "Topic",
        targetId: "active-1",
        createdAt: new Date(),
      }
    ]
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
