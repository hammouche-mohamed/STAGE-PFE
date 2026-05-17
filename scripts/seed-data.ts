import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * Minimal seed: just the accounts needed to test scenarios by hand.
 *  - 2 departments
 *  - 1 super admin (unchanged)
 *  - 1 department admin per department
 *  - 2 companies
 *  - 5 students per department, one at each level L1 → M2
 *
 * No teachers / topics / internships / documents — created manually.
 */
async function main() {
  const currentYear = "2025-2026";

  const passwordHashes = {
    student: await bcrypt.hash("studentstudent12", 10),
    supervisor: await bcrypt.hash("supervisorsupervisor12", 10),
    company: await bcrypt.hash("companycompany12", 10),
    admin: await bcrypt.hash("adminadmin12", 10),
  };

  console.log("Cleaning database...");
  // Order-independent reset: disable FK checks, TRUNCATE every base table,
  // then re-enable. Excludes Prisma's own migrations table.
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
      { key: "registrationOpen", value: "true", updatedAt: new Date() },
    ],
  });

  console.log("Creating departments...");
  const depts = [
    { name: "Computer Science", code: "CS" },
    { name: "Chemistry", code: "CH" },
  ];
  const createdDepts = [];
  for (const dept of depts) {
    createdDepts.push(await (prisma.filiere as any).create({ data: dept }));
  }

  console.log("Creating super admin...");
  await (prisma.user as any).create({
    data: {
      name: "hammouche mohamed",
      email: "kalomino.2006@gmail.com",
      password: passwordHashes.admin,
      role: "ADMIN",
      isActive: true,
      mustChangePassword: false,
      adminprofile: { create: { isSuperAdmin: true } },
    },
  });

  console.log("Creating department admins...");
  for (let i = 0; i < createdDepts.length; i++) {
    await (prisma.user as any).create({
      data: {
        name: `Admin ${createdDepts[i].name}`,
        email: `admin${i + 1}@gmail.com`,
        password: passwordHashes.admin,
        role: "ADMIN",
        isActive: true,
        mustChangePassword: false,
        adminprofile: {
          create: { filiereId: createdDepts[i].id, isSuperAdmin: false },
        },
      },
    });
  }

  console.log("Creating companies...");
  for (let i = 1; i <= 2; i++) {
    await (prisma.user as any).create({
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
          },
        },
      },
    });
  }

  console.log("Creating supervisors (2 per department)...");
  let supervisorNo = 0;
  for (let d = 0; d < createdDepts.length; d++) {
    for (let k = 0; k < 2; k++) {
      supervisorNo++;
      await (prisma.user as any).create({
        data: {
          name: `Supervisor ${supervisorNo}`,
          email: `supervisor${supervisorNo}@gmail.com`,
          password: passwordHashes.supervisor,
          role: "TEACHER",
          isActive: true,
          mustChangePassword: false,
          teacherprofile: {
            create: {
              filiereId: createdDepts[d].id,
              grade: "Maitre de Conferences",
              speciality: createdDepts[d].name,
            },
          },
        },
      });
    }
  }

  // Several students at EACH level in EACH department, so teams/binômes can
  // be formed from same-level, same-department peers.
  const STUDENTS_PER_LEVEL = 4;
  const levels = ["L1", "L2", "L3", "M1", "M2"];
  console.log(
    `Creating students (${STUDENTS_PER_LEVEL} per level × ${levels.length} levels × ${createdDepts.length} departments)...`,
  );
  let studentNo = 0;
  for (let d = 0; d < createdDepts.length; d++) {
    for (let l = 0; l < levels.length; l++) {
      const level = levels[l];
      for (let k = 0; k < STUDENTS_PER_LEVEL; k++) {
        studentNo++;
        await (prisma.user as any).create({
          data: {
            name: `Student ${studentNo}`,
            email: `student${studentNo}@gmail.com`,
            password: passwordHashes.student,
            role: "STUDENT",
            isActive: true,
            mustChangePassword: false,
            level,
            studentprofile: {
              create: {
                filiereId: createdDepts[d].id,
                studentId: `ST${studentNo.toString().padStart(4, "0")}`,
                promotion: "2025",
                speciality: createdDepts[d].name,
                academicYear: currentYear,
                level,
              },
            },
          },
        });
      }
    }
  }

  console.log("Seeding completed successfully!");
  console.log("");
  console.log("Accounts (password in parentheses):");
  console.log("  Super admin : kalomino.2006@gmail.com (adminadmin12)");
  console.log("  Dept admins : admin1@gmail.com = Computer Science, admin2@gmail.com = Chemistry (adminadmin12)");
  console.log("  Companies   : company1@gmail.com, company2@gmail.com (companycompany12)");
  console.log("  Supervisors : supervisor1-2 = Computer Science, supervisor3-4 = Chemistry (supervisorsupervisor12)");
  console.log("  Students    : student1..studentN @gmail.com (studentstudent12), 4 per level so teams can be formed");
  console.log("    Computer Science → L1: student1-4   L2: student5-8   L3: student9-12   M1: student13-16  M2: student17-20");
  console.log("    Chemistry        → L1: student21-24  L2: student25-28  L3: student29-32  M1: student33-36  M2: student37-40");
  console.log("    (a team must be same department + same level — e.g. student1 + student2 are both CS L1)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
