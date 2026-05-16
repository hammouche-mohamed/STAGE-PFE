/**
 * Clean ONLY the workflow data for manual end-to-end testing.
 *
 * KEEPS: users, all profiles, filières (departments), systemSettings,
 *        blockedEmail  → you can log in straight away.
 * WIPES: topics, internships, internship students, documents, messages,
 *        message reads, student applications, teams, team members, team /
 *        binôme invitations, teacher applications, validations, deadlines,
 *        notifications, audit logs, registration requests, password-reset
 *        tokens, login attempts.
 * RESETS: every teacher's currentLoad → 0, isAvailable → true.
 *
 * Run:  npx tsx scripts/clean-workflow.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const WORKFLOW_TABLES = [
  "binomeinvitation",
  "teaminvitation",
  "teammember",
  "studentteam",
  "studentapplication",
  "messageread",
  "message",
  "document",
  "validation",
  "deadline",
  "internshipstudent",
  "internship",
  "teacherapplication",
  "topic",
  "notification",
  "auditlog",
  "registrationrequest",
  "passwordresettoken",
  "loginattempt",
];

async function main() {
  console.log("Cleaning workflow data (accounts/departments/settings kept)…");

  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");
  for (const t of WORKFLOW_TABLES) {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE \`${t}\``);
      console.log(`  cleared ${t}`);
    } catch (e: any) {
      console.log(`  skipped ${t} (${e.message?.split("\n")[0]})`);
    }
  }
  await prisma.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");

  const reset = await prisma.teacherProfile.updateMany({
    data: { currentLoad: 0, isAvailable: true },
  });
  console.log(`  reset ${reset.count} teacher load(s) → 0 / available`);

  const [users, filieres] = await Promise.all([
    prisma.user.count(),
    prisma.filiere.count(),
  ]);
  console.log(
    `\nDone. Kept ${users} users across ${filieres} departments. Ready for manual testing.`,
  );
}

main()
  .catch((e) => {
    console.error("Clean failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
