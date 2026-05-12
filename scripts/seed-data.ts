import { PrismaClient, user_role, topic_type, topic_status, registrationrequest_role, registrationrequest_status } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const academicYear = "2024-2025";
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
      console.log(`Skipping deletion for ${model} (might not exist or order issue)`);
    }
  }

  console.log("Setting system configurations...");
  await prisma.systemSettings.create({
    data: {
      id: "current-year-id",
      key: "currentAcademicYear",
      value: academicYear,
      updatedAt: new Date()
    }
  });

  console.log("Creating departments...");
  const depts = [
    { name: "Computer Science", code: "CS" },
    { name: "Chemistry", code: "CH" },
    { name: "Electronics", code: "EL" },
    { name: "E-commerce", code: "EC" },
    { name: "SM", code: "SM" },
  ];

  const createdDepts = [];
  for (const dept of depts) {
    const d = await prisma.filiere.create({ data: dept });
    createdDepts.push(d);
  }

  console.log("Creating companies...");
  const companies = [];
  for (let i = 1; i <= 4; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Company ${i}`,
        email: `company${i}@gmail.com`,
        password: passwordHashes.company,
        role: "COMPANY",
        isActive: true,
        mustChangePassword: false,
        companyProfile: {
          create: {
            companyName: `Company ${i} SARL`,
            sector: "Industry",
            address: `Address ${i}`,
            wilaya: "Algiers",
          }
        }
      }
    });
    companies.push(user);
  }

  console.log("Creating department admins...");
  const admins = [];
  
  // Create the requested Super Admin first
  await prisma.user.create({
    data: {
      name: "hammouche mohamed",
      email: "kalomino.2006@gmail.com",
      password: passwordHashes.admin,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      adminProfile: {
        create: {
          isSuperAdmin: true,
        }
      }
    }
  });

  for (let i = 0; i < createdDepts.length; i++) {
    const user = await prisma.user.create({
      data: {
        name: `Admin ${createdDepts[i].name}`,
        email: `admin${i + 1}@gmail.com`,
        password: passwordHashes.admin,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
        department: createdDepts[i].name, // Filling the User field
        adminProfile: {
          create: {
            filiereId: createdDepts[i].id,
            isSuperAdmin: false,
          }
        }
      }
    });
    admins.push(user);
  }

  console.log("Creating supervisors...");
  const supervisors = [];
  for (let i = 0; i < createdDepts.length; i++) {
    for (let j = 1; j <= 2; j++) {
      const idx = i * 2 + j;
      const user = await prisma.user.create({
        data: {
          name: `Supervisor ${idx}`,
          email: `supervisor${idx}@gmail.com`,
          password: passwordHashes.supervisor,
          role: "TEACHER",
          isActive: true,
          mustChangePassword: false,
          department: createdDepts[i].name, // Filling the User field
          teacherProfile: {
            create: {
              filiereId: createdDepts[i].id,
              grade: "Professor",
              speciality: createdDepts[i].name,
              maxStudents: 5,
            }
          }
        }
      });
      supervisors.push(user);
    }
  }

  console.log("Creating students...");
  const students = [];
  for (let i = 0; i < createdDepts.length; i++) {
    for (let j = 1; j <= 10; j++) {
      const idx = i * 10 + j;
      const level = levels[(j - 1) % levels.length]; // Distribute L1, L2, L3, M1, M2
      const user = await prisma.user.create({
        data: {
          name: `Student ${idx}`,
          email: `student${idx}@gmail.com`,
          password: passwordHashes.student,
          role: "STUDENT",
          isActive: true,
          mustChangePassword: false,
          department: createdDepts[i].name, // Filling the User field
          level: level, // Filling the User field
          studentProfile: {
            create: {
              filiereId: createdDepts[i].id,
              studentId: `ST${idx.toString().padStart(4, '0')}`,
              promotion: "2025",
              speciality: createdDepts[i].name,
              academicYear: academicYear,
              level: level,
            }
          }
        }
      });
      students.push(user);
    }
  }

  console.log("Creating topics...");
  // 1 validated topic per supervisor
  for (let i = 0; i < supervisors.length - 1; i++) {
    await prisma.topic.create({
      data: {
        title: `Topic for ${supervisors[i].name}`,
        description: "Comprehensive study on relevant field topics.",
        type: "STUDENT_PROPOSED",
        status: "APPROVED",
        academicYear,
        proposedById: supervisors[i].id,
        filiereId: createdDepts[Math.floor(i / 2)].id,
        maxStudents: 2,
        updatedAt: new Date(),
      }
    });
  }

  // Some non-validated topics
  for (let i = 0; i < companies.length; i++) {
    await prisma.topic.create({
      data: {
        title: `Draft Topic from ${companies[i].name}`,
        description: "Experimental project idea for industry collaboration.",
        type: "COMPANY_PROPOSED",
        status: "PENDING_ADMIN",
        academicYear,
        proposedById: companies[i].id,
        filiereId: createdDepts[0].id,
        maxStudents: 2,
        updatedAt: new Date(),
      }
    });
  }

  console.log("Creating teams and internships...");
  for (let i = 0; i < 5; i++) {
    const leader = students[i];
    const partner = students[i + 5];
    const supervisor = supervisors[0];

    const team = await prisma.studentTeam.create({
      data: {
        leaderId: leader.id,
        filiereId: createdDepts[0].id,
        academicYear,
        members: {
          create: [
            { studentId: leader.id, isLeader: true },
            { studentId: partner.id, isLeader: false },
          ]
        }
      }
    });

    const topic = await prisma.topic.create({
      data: {
        title: `Team Project ${i + 1}`,
        description: "Joint collaboration project.",
        type: "STUDENT_PROPOSED",
        status: "TAKEN",
        academicYear,
        proposedById: leader.id,
        filiereId: createdDepts[0].id,
        maxStudents: 2,
        updatedAt: new Date(),
      }
    });

    await prisma.internship.create({
      data: {
        topicId: topic.id,
        teacherId: supervisor.id,
        academicYear,
        status: "IN_PROGRESS",
        students: {
          create: [
            { studentId: leader.id, isLeader: true },
            { studentId: partner.id, isLeader: false },
          ]
        },
        updatedAt: new Date(),
      }
    });
  }

  // --- AUDIT LOGS ---
  const superAdmin = await prisma.user.findFirst({ where: { email: "kalomino.2006@gmail.com" } });
  if (superAdmin) {
    await prisma.auditLog.createMany({
      data: [
        {
          id: crypto.randomUUID(),
          userId: superAdmin.id,
          action: "SYSTEM_CONFIG_UPDATED",
          targetType: "Settings",
          targetId: "Global",
          details: JSON.stringify({ academicYear: "2024-2025", registrations: "OPEN" }),
          createdAt: new Date(Date.now() - 86400000 * 2) // 2 days ago
        },
        {
          id: crypto.randomUUID(),
          userId: superAdmin.id,
          action: "USER_STATUS_TOGGLED",
          targetType: "User",
          targetId: "Student 1",
          details: JSON.stringify({ status: "ACTIVE", reason: "Registration approved" }),
          createdAt: new Date(Date.now() - 3600000 * 5) // 5 hours ago
        },
        {
          id: crypto.randomUUID(),
          userId: superAdmin.id,
          action: "TOPIC_VALIDATED",
          targetType: "Topic",
          targetId: "Topic for Supervisor 1",
          details: JSON.stringify({ status: "APPROVED" }),
          createdAt: new Date(Date.now() - 3600000) // 1 hour ago
        }
      ]
    });
  }

  console.log("Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
