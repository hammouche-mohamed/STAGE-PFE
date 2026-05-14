import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * NFR-RDI3: enforce "one active internship per student per academic year".
 *
 * Prisma cannot express this as a partial unique constraint, so the check
 * is done in application code. Call this from inside the surrounding
 * `$transaction` so a concurrent insert can't slip through between the
 * check and the create.
 *
 * Throws if any of the given students already participate in an internship
 * for `academicYear` whose status is not COMPLETED or CANCELLED.
 */
export async function assertNoActiveInternship(
  db: Db,
  studentIds: string[],
  academicYear: string,
): Promise<void> {
  if (studentIds.length === 0) return;

  const conflicting = await db.internshipStudent.findFirst({
    where: {
      studentId: { in: studentIds },
      internship: {
        academicYear,
        status: { notIn: ["COMPLETED", "CANCELLED"] },
      },
    },
    include: {
      user: { select: { name: true } },
      internship: { select: { topic: { select: { title: true } } } },
    },
  });

  if (conflicting) {
    const studentName = conflicting.user?.name ?? "A student";
    const topicTitle = conflicting.internship?.topic?.title ?? "another internship";
    throw new Error(
      `${studentName} is already assigned to "${topicTitle}" for ${academicYear}. ` +
        "A student can only hold one active internship per academic year.",
    );
  }
}
