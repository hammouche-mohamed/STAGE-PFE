import { PrismaClient, user_role, topic_type, topic_status, registrationrequest_role, registrationrequest_status, internship_status } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const archiveYear = "2024-2025";
  const currentYear = "2025-2026";
  const nextYear = "2026-2027";
  const passwordHashes = {
    student: await bcrypt.hash("studentstudent12", 10),
    supervisor: await bcrypt.hash("supervisorsupervisor12", 10),
    company: await bcrypt.hash("companycompany12", 10),
    admin: await bcrypt.hash("adminadmin12", 10),
  };

  console.log("Cleaning database...");
  // Robust, order-independent reset: disable FK checks, TRUNCATE every base
  // table in the current schema, then re-enable. This always fully clears the
  // DB (no fragile delete-order / FK-block issues) so the reseed below never
  // hits stale rows or unique-constraint conflicts. Excludes Prisma's own
  // migrations table.
  const tableRows = await prisma.$queryRawUnsafe<{ t: string }[]>(
    "SELECT table_name AS t FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE'",
  );
  const tables = tableRows
    .map((r: any) => r.t ?? r.T ?? r.table_name)
    .filter((n: string) => n && n !== "_prisma_migrations");

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const tbl of tables) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${tbl}\``);
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
  console.log(`  cleared ${tables.length} tables`);

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
  // Concentrate students at the two PFE-eligible levels (L3 + M2) so a
  // student looking for a binôme actually has multiple peers in their
  // filière/year cohort. With 8 students/dept split 4 + 4, every student
  // sees 3 invitable peers instead of 1.
  const pfeLevels = ["L3", "M2"];
  for (let i = 0; i < createdDepts.length; i++) {
    for (let j = 1; j <= 8; j++) {
      const idx = i * 8 + j;
      const level = pfeLevels[(j - 1) % pfeLevels.length];
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
        // Past year is already closed → completed topic is archived-out:
        // gone from the live site, still visible in Archives.
        archivedAt: new Date(`${archiveYear.split('-')[1]}-08-31`),
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

  // ── UNASSIGNED TOPICS (no internship yet) ───────────────────────────────────
  // These exist so the three roles can verify visibility:
  //   • Admin sees every status in their filière (Admin Topics page)
  //   • Teacher sees APPROVED topics with no assigned teacher in their filière
  //   • Student sees OPEN_FOR_SELECTION topics in their filière
  //
  // Note: none of these are linked to an internship, so the year-archive
  // logic (which only includes TAKEN + COMPLETED/CANCELLED) will NOT pull
  // them in. They stay live across year rollovers.
  console.log("Generating unassigned topics (cross-role visibility)...");

  // APPROVED but no teacher assigned yet — teachers can apply to supervise
  for (let i = 0; i < 3; i++) {
    await (prisma.topic as any).create({
      data: {
        title: `Open Supervision Topic ${i + 1}`,
        description: "Admin-approved topic awaiting a supervisor.",
        type: "COMPANY_PROPOSED",
        status: "APPROVED",
        academicYear: currentYear,
        proposedById: companies[i % companies.length].id,
        filiereId: createdDepts[i % createdDepts.length].id,
        maxStudents: 1,
        assignedTeacherId: null,
        targetLevels: "L3,M1,M2",
        updatedAt: new Date(),
      }
    });
  }

  // OPEN_FOR_SELECTION — students can pick & apply.
  // Mix internshipType (NORMAL for L1/L2/M1, PFE for L3/M2) and targetLevels
  // so every student level finds something on their topics page.
  const openForSelectionTemplates = [
    { internshipType: "NORMAL", targetLevels: "L1,L2,L3,M1,M2" },
    { internshipType: "NORMAL", targetLevels: "L1,L2" },
    { internshipType: "PFE",    targetLevels: "L3,M2" },
    { internshipType: "PFE",    targetLevels: "M1,M2" },
  ] as const;

  for (let i = 0; i < openForSelectionTemplates.length; i++) {
    const tpl = openForSelectionTemplates[i];
    const dept = createdDepts[i % createdDepts.length];
    const sup = supervisors[i % supervisors.length];
    await (prisma.topic as any).create({
      data: {
        title: `Available Project ${i + 1}`,
        description: "Subject open for student selection this year.",
        type: i % 2 === 0 ? "COMPANY_PROPOSED" : "STUDENT_PROPOSED",
        internshipType: tpl.internshipType,
        status: "OPEN_FOR_SELECTION",
        academicYear: currentYear,
        proposedById: i % 2 === 0 ? companies[i % companies.length].id : students[i].id,
        filiereId: dept.id,
        assignedTeacherId: sup.id,
        maxStudents: i % 2 === 0 ? 2 : 1,
        targetLevels: tpl.targetLevels,
        updatedAt: new Date(),
      }
    });
  }

  // ── ARCHIVE-YEAR CARRY-OVERS ────────────────────────────────────────────────
  // Topics from the previous academic year that did NOT finish cleanly.
  // They must remain in the database; the archive view correctly excludes
  // them because archive only includes TAKEN topics whose internship is
  // COMPLETED or CANCELLED.
  console.log("Generating archive-year carry-overs (must not be archived/deleted)...");

  // 1. An archive-year topic that was APPROVED but never picked up.
  await (prisma.topic as any).create({
    data: {
      title: `Unclaimed Archive Topic`,
      description: "Approved last year but no internship was ever created.",
      type: "COMPANY_PROPOSED",
      status: "APPROVED",
      academicYear: archiveYear,
      proposedById: companies[0].id,
      filiereId: createdDepts[0].id,
      maxStudents: 1,
      updatedAt: new Date(),
    }
  });

  // 2. An archive-year topic whose internship is still IN_PROGRESS
  //    (genuine carry-over into the new year).
  const carryTopic = await (prisma.topic as any).create({
    data: {
      title: `Carry-Over Project`,
      description: "Started last year, still running.",
      type: "STUDENT_PROPOSED",
      status: "TAKEN",
      academicYear: archiveYear,
      proposedById: students[0].id,
      filiereId: createdDepts[0].id,
      maxStudents: 1,
      updatedAt: new Date(),
    }
  });
  await (prisma.internship as any).create({
    data: {
      topicId: carryTopic.id,
      teacherId: supervisors[0].id,
      academicYear: archiveYear,
      status: "IN_PROGRESS",
      internshipType: "PFE",
      internshipstudent: { create: [{ studentId: students[0].id, isLeader: true }] },
      updatedAt: new Date(),
    }
  });

  // ── NEXT YEAR DATA (2026-2027) ──────────────────────────────────────────────
  // Seeded so the platform can be tested against the upcoming academic year
  // (year-rollover scenarios, "future planning" views, etc.).
  // Reuses the existing user pool — no new users are created.
  console.log("Generating Next Year Data (2026-2027)...");

  // (a) PENDING_ADMIN — companies have submitted topics, admin review pending.
  for (let i = 0; i < 3; i++) {
    await (prisma.topic as any).create({
      data: {
        title: `Future Industry Topic ${i + 1}`,
        description: "Company proposal awaiting admin validation for next year.",
        type: "COMPANY_PROPOSED",
        status: "PENDING_ADMIN",
        academicYear: nextYear,
        proposedById: companies[i % companies.length].id,
        filiereId: createdDepts[i % createdDepts.length].id,
        maxStudents: 2,
        targetLevels: "L3,M1,M2",
        updatedAt: new Date(),
      }
    });
  }

  // (b) APPROVED, no assigned teacher — visible to teachers who can apply.
  for (let i = 0; i < 2; i++) {
    await (prisma.topic as any).create({
      data: {
        title: `Next-Year Open Supervision ${i + 1}`,
        description: "Admin-approved next-year topic, awaiting a supervisor.",
        type: "COMPANY_PROPOSED",
        status: "APPROVED",
        academicYear: nextYear,
        proposedById: companies[i % companies.length].id,
        filiereId: createdDepts[(i + 1) % createdDepts.length].id,
        maxStudents: 1,
        assignedTeacherId: null,
        targetLevels: "L3,M1,M2",
        updatedAt: new Date(),
      }
    });
  }

  // (c) OPEN_FOR_SELECTION — supervisor already assigned, students can pick.
  for (let i = 0; i < 3; i++) {
    await (prisma.topic as any).create({
      data: {
        title: `Next-Year Available Project ${i + 1}`,
        description: "Topic open for student selection in the upcoming year.",
        type: i % 2 === 0 ? "COMPANY_PROPOSED" : "STUDENT_PROPOSED",
        status: "OPEN_FOR_SELECTION",
        academicYear: nextYear,
        proposedById: i % 2 === 0
          ? companies[i % companies.length].id
          : students[20 + i].id,
        filiereId: createdDepts[i % createdDepts.length].id,
        assignedTeacherId: supervisors[i % supervisors.length].id,
        maxStudents: i % 2 === 0 ? 2 : 1,
        targetLevels: "L3,M1,M2",
        updatedAt: new Date(),
      }
    });
  }

  // (d) TAKEN with internship REQUESTED — students picked them, paperwork
  //     not finalised yet.
  for (let i = 0; i < 2; i++) {
    const student = students[24 + i];
    const supervisor = supervisors[i % supervisors.length];
    const topic = await (prisma.topic as any).create({
      data: {
        title: `Next-Year Early Pick ${i + 1}`,
        description: "Early-claimed topic for next year, awaiting confirmation.",
        type: "STUDENT_PROPOSED",
        status: "TAKEN",
        academicYear: nextYear,
        proposedById: student.id,
        filiereId: createdDepts[i % createdDepts.length].id,
        assignedTeacherId: supervisor.id,
        maxStudents: 1,
        targetLevels: "L3,M1,M2",
        updatedAt: new Date(),
      }
    });
    await (prisma.internship as any).create({
      data: {
        topicId: topic.id,
        teacherId: supervisor.id,
        academicYear: nextYear,
        status: "REQUESTED",
        internshipType: "PFE",
        internshipstudent: { create: [{ studentId: student.id, isLeader: true }] },
        updatedAt: new Date(),
      }
    });
  }

  // (e) One TAKEN topic with an IN_PROGRESS internship — an early starter
  //     who began their project ahead of the official year start.
  {
    const student = students[28];
    const supervisor = supervisors[0];
    const topic = await (prisma.topic as any).create({
      data: {
        title: `Next-Year Early Starter`,
        description: "Internship already underway for the upcoming year.",
        type: "COMPANY_PROPOSED",
        status: "TAKEN",
        academicYear: nextYear,
        proposedById: companies[0].id,
        filiereId: createdDepts[0].id,
        assignedTeacherId: supervisor.id,
        maxStudents: 1,
        updatedAt: new Date(),
      }
    });
    await (prisma.internship as any).create({
      data: {
        topicId: topic.id,
        teacherId: supervisor.id,
        academicYear: nextYear,
        status: "IN_PROGRESS",
        internshipType: "NORMAL",
        internshipstudent: { create: [{ studentId: student.id, isLeader: true }] },
        updatedAt: new Date(),
      }
    });
  }

  // ── REJECTED TOPICS (per year) ──────────────────────────────────────────────
  // REJECTED topics belong in the archive view of the year they were rejected
  // in. They are NOT a carry-over — once refused they're considered "closed
  // business" for that academic year.
  console.log("Generating rejected topics...");
  for (const [yearLabel, count] of [[archiveYear, 2], [currentYear, 1]] as const) {
    for (let i = 0; i < count; i++) {
      await (prisma.topic as any).create({
        data: {
          title: `Refused Topic ${yearLabel} #${i + 1}`,
          description: "Proposal that the validation chain refused.",
          type: "STUDENT_PROPOSED",
          status: "REJECTED",
          academicYear: yearLabel,
          proposedById: students[i + (yearLabel === archiveYear ? 0 : 16)].id,
          filiereId: createdDepts[i % createdDepts.length].id,
          maxStudents: 1,
          rejectionReason: "Out of scope for the filière",
          // Past (already-archived) year → its rejected topics are
          // archived-out (off the live site, still in Archives). The
          // current year's rejected topics stay live until its year is
          // archived (then the year-archive action moves them out).
          ...(yearLabel === archiveYear
            ? { archivedAt: new Date(`${yearLabel.split('-')[1]}-08-31`) }
            : {}),
          updatedAt: new Date(),
        }
      });
    }
  }

  // ── TEACHER APPLICATIONS ────────────────────────────────────────────────────
  // • Archive year (2024-2025): one APPROVED + one REJECTED — frozen in time,
  //   they belong to the archive of that year.
  // • Current year (2025-2026): one PENDING — a real carry-over: when the
  //   admin promotes 2026-2027 to "current", this pending row must remain
  //   alive in the main table so the workflow keeps functioning.
  // • Next year (2026-2027): one PENDING — proves the new-year pipeline is
  //   already active for supervisors.
  console.log("Generating teacher applications (carry-over + archived)...");
  const openSupervisionTopic = await (prisma.topic as any).findFirst({
    where: { status: "APPROVED", academicYear: currentYear, assignedTeacherId: null },
  });
  if (openSupervisionTopic) {
    await (prisma.teacherApplication as any).create({
      data: {
        teacherId: supervisors[0].id,
        topicId: openSupervisionTopic.id,
        status: "PENDING",
        message: "I would be happy to supervise this topic.",
      }
    });
  }

  const archiveTakenTopic = await (prisma.topic as any).findFirst({
    where: { status: "TAKEN", academicYear: archiveYear },
  });
  if (archiveTakenTopic) {
    await (prisma.teacherApplication as any).create({
      data: {
        teacherId: supervisors[1].id,
        topicId: archiveTakenTopic.id,
        status: "ACCEPTED",
        message: "Application from last year — accepted.",
      }
    });
    await (prisma.teacherApplication as any).create({
      data: {
        teacherId: supervisors[2].id,
        topicId: archiveTakenTopic.id,
        status: "REJECTED",
        message: "Application from last year — rejected.",
      }
    });
  }

  const nextYearOpenTopic = await (prisma.topic as any).findFirst({
    where: { status: "APPROVED", academicYear: nextYear, assignedTeacherId: null },
  });
  if (nextYearOpenTopic) {
    await (prisma.teacherApplication as any).create({
      data: {
        teacherId: supervisors[3].id,
        topicId: nextYearOpenTopic.id,
        status: "PENDING",
        message: "Applying to supervise this next-year topic.",
      }
    });
  }

  // ── REGISTRATION REQUESTS ───────────────────────────────────────────────────
  // Same lifecycle pattern as teacher applications:
  // • Archive year: a few APPROVED + REJECTED requests (frozen).
  // • Current year: PENDING requests — must survive the year-rollover so the
  //   admin can still process them after promotion.
  // • Next year: PENDING requests already coming in.
  console.log("Generating registration requests (carry-over + archived)...");
  const reqHash = await bcrypt.hash("requestrequest12", 10);

  // Archive year — frozen historical requests
  await (prisma.registrationRequest as any).createMany({
    data: [
      {
        name: "Old Student Request",
        email: "old.student@example.com",
        password: reqHash,
        role: "STUDENT" as const,
        status: "APPROVED" as const,
        academicYear: archiveYear,
        speciality: createdDepts[0].name,
        promotion: "L3",
        level: "L3" as any,
        studentId: "REQ0001",
        createdAt: new Date(`${archiveYear.split('-')[0]}-10-05`),
        reviewedAt: new Date(`${archiveYear.split('-')[0]}-10-08`),
      },
      {
        name: "Old Company Request",
        email: "old.company@example.com",
        password: reqHash,
        role: "COMPANY" as const,
        status: "REJECTED" as const,
        academicYear: archiveYear,
        companyName: "Spam Industries",
        sector: "Unknown",
        wilaya: "Algiers",
        adminComment: "Could not verify legal entity",
        createdAt: new Date(`${archiveYear.split('-')[0]}-11-12`),
        reviewedAt: new Date(`${archiveYear.split('-')[0]}-11-14`),
      },
    ]
  });

  // Current year — pending (carry-over)
  await (prisma.registrationRequest as any).createMany({
    data: [
      {
        name: "Late Student Applicant",
        email: "late.student@example.com",
        password: reqHash,
        role: "STUDENT" as const,
        status: "PENDING" as const,
        academicYear: currentYear,
        speciality: createdDepts[1].name,
        promotion: "M1",
        level: "M1" as any,
        studentId: "REQ0042",
        createdAt: new Date(),
      },
      {
        name: "New Teacher Applicant",
        email: "new.teacher@example.com",
        password: reqHash,
        role: "TEACHER" as const,
        status: "PENDING" as const,
        academicYear: currentYear,
        speciality: createdDepts[2].name,
        grade: "Maitre Assistant",
        createdAt: new Date(),
      },
    ]
  });

  // Next year — pending requests for the upcoming year
  await (prisma.registrationRequest as any).create({
    data: {
      name: "Next-Year Company",
      email: "next.year.company@example.com",
      password: reqHash,
      role: "COMPANY" as const,
      status: "PENDING" as const,
      academicYear: nextYear,
      companyName: "Future Tech SARL",
      sector: "Software",
      wilaya: "Oran",
      createdAt: new Date(),
    }
  });

  // ── TOPICS WITH PENDING MODIFICATION REQUESTS ──────────────────────────────
  // Pick a couple of already-created topics and stamp them with a
  // `pendingEditData` snapshot, so the admin's Topics > "Modifications" tab
  // has rows to review.
  console.log("Generating topics with pending edit requests...");

  const topicToEdit1 = await (prisma.topic as any).findFirst({
    where: { title: "Open Supervision Topic 1" },
  });
  if (topicToEdit1) {
    await (prisma.topic as any).update({
      where: { id: topicToEdit1.id },
      data: {
        pendingEditData: JSON.stringify({
          title: "Open Supervision Topic 1 (revised)",
          description: "Scope clarified after a discussion with the company supervisor.",
        }),
        pendingEditRequestedAt: new Date(),
      },
    });
  }

  const topicToEdit2 = await (prisma.topic as any).findFirst({
    where: { title: "Available Project 2" },
  });
  if (topicToEdit2) {
    await (prisma.topic as any).update({
      where: { id: topicToEdit2.id },
      data: {
        pendingEditData: JSON.stringify({
          description: "Updated description: now uses Next.js 15 instead of Next.js 14.",
          requiredSkills: "TypeScript, React, Prisma, PostgreSQL",
        }),
        pendingEditRequestedAt: new Date(),
      },
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

  // ── Company applicants ──────────────────────────────────────────────────
  // A few student teams applying to company-proposed OPEN topics so the
  // Company role's "Applicants" view has data to test (solo + binôme, a mix
  // of PENDING and one ACCEPTED). Runs against the data seeded above.
  console.log("Seeding company applicants...");
  {
    const openCoTopics = await prisma.topic.findMany({
      where: { status: "OPEN_FOR_SELECTION", proposedBy: { role: "COMPANY" } },
      select: { id: true, title: true, filiereId: true, academicYear: true },
      take: 5,
    });
    const freeStudents = await prisma.user.findMany({
      where: {
        role: "STUDENT",
        teammember: { none: {} },
        internshipstudent: { none: {} },
      },
      select: { id: true, name: true, studentprofile: { select: { filiereId: true } } },
    });

    const usedStu = new Set<string>();
    const pickStudents = (filiereId: string | null, n: number) => {
      const same = freeStudents.filter(
        (s) => !usedStu.has(s.id) && s.studentprofile?.filiereId === filiereId,
      );
      const any = freeStudents.filter((s) => !usedStu.has(s.id));
      const pool = same.length >= n ? same : any;
      const chosen = pool.slice(0, n);
      chosen.forEach((s) => usedStu.add(s.id));
      return chosen;
    };

    const appStatuses = ["PENDING", "PENDING", "ACCEPTED", "PENDING", "PENDING"];
    let madeApps = 0;
    for (let i = 0; i < openCoTopics.length; i++) {
      const tp = openCoTopics[i];
      const wantBinome = i % 2 === 1;
      const members = pickStudents(tp.filiereId, wantBinome ? 2 : 1);
      if (members.length === 0) continue;
      const lead = members[0];
      const partner = members[1];

      const team = await prisma.studentTeam.create({
        data: {
          leaderId: lead.id,
          filiereId: tp.filiereId,
          academicYear: tp.academicYear,
          reason: "Motivated team interested in this industry project.",
          updatedAt: new Date(),
          teammember: {
            create: [
              { studentId: lead.id, isLeader: true },
              ...(partner ? [{ studentId: partner.id, isLeader: false }] : []),
            ],
          },
        } as any,
      });

      const status = appStatuses[i % appStatuses.length];
      await prisma.studentApplication.create({
        data: {
          topicId: tp.id,
          teamId: team.id,
          leaderId: lead.id,
          partnerId: partner?.id ?? null,
          isBinome: !!partner,
          status: status as any,
          message:
            "We're very interested in this topic and believe our skills are a strong match.",
          appliedAt: new Date(),
          ...(status === "ACCEPTED" ? { reviewedAt: new Date() } : {}),
        } as any,
      });
      madeApps++;
    }
    console.log(`  + ${madeApps} company application(s) seeded`);
  }

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
