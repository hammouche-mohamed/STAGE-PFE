import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import {
  recordArchivedYear,
  getSuperAdminIds,
  DELETION_GRACE_DAYS,
} from "@/lib/services/archiveRetention.service";

/**
 * Bulk-archive a whole academic year.
 *
 * This is the ONLY way topics/internships get archived. It is triggered
 * from Settings when the Super Admin changes the academic year and confirms
 * the archive prompt. Per-topic manual archiving was removed by design.
 *
 * "Archive" = set archivedAt (soft). Nothing is ever deleted: rows stay in
 * the main tables and the Archives view reads them back filtered by year.
 *
 * Super Admin only (system-wide operation).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isSuperAdmin) {
    return NextResponse.json(
      { error: "Forbidden: only the Super Administrator can archive a year." },
      { status: 403 },
    );
  }

  try {
    const { year } = await req.json();

    if (!year || typeof year !== "string" || !/^\d{4}-\d{4}$/.test(year)) {
      return NextResponse.json(
        { error: "A valid academic year (e.g. 2024-2025) is required." },
        { status: 400 },
      );
    }

    const now = new Date();
    const FINISHED = ['COMPLETED', 'CANCELLED'];

    // Archive ONLY what is truly done — never ongoing work, which carries
    // over into the new year untouched:
    //  • Topics: only REJECTED ones and TAKEN ones whose internship finished.
    //    Pending / approved / open topics stay live (carried over).
    //  • Internships: only finished (COMPLETED / CANCELLED). Ongoing
    //    internships are NEVER archived/deleted — they keep running.
    const [topicsRes, internshipsRes] = await prisma.$transaction([
      (prisma as any).topic.updateMany({
        where: {
          academicYear: year,
          archivedAt: null,
          OR: [
            { status: 'REJECTED' },
            { status: 'TAKEN', internship: { status: { in: FINISHED } } },
          ],
        },
        data: { archivedAt: now },
      }),
      (prisma as any).internship.updateMany({
        where: { academicYear: year, archivedAt: null, status: { in: FINISHED } },
        data: { archivedAt: now },
      }),
    ]);

    const archivedTopics = topicsRes.count ?? 0;
    const archivedInternships = internshipsRes.count ?? 0;

    // Apply the 3-year retention policy: this may push the oldest archived
    // year into a 3-day permanent-deletion countdown.
    const { evictedYear, scheduledDeleteAt } = await recordArchivedYear(year);

    await AuditService.log({
      userId: session.user.id,
      action: "YEAR_ARCHIVED",
      targetType: "AcademicYear",
      targetId: year,
      details: { year, archivedTopics, archivedInternships, evictedYear },
    });

    // Day-0 warning: tell the Super Admin(s) immediately that the evicted
    // year is now on a countdown and must be downloaded before it's purged.
    if (evictedYear && scheduledDeleteAt) {
      const when = new Date(scheduledDeleteAt);
      const superAdmins = await getSuperAdminIds();
      await Promise.all(
        superAdmins.map((uid) =>
          NotificationService.trigger({
            userId: uid,
            type: "DEADLINE_APPROACHING",
            title: `Archive of ${evictedYear} will be permanently deleted`,
            message:
              `Archiving ${year} pushed ${evictedYear} out of the archive. ` +
              `All of its data (topics, internships, documents, messages) will be ` +
              `PERMANENTLY DELETED on ${when.toLocaleDateString()} ` +
              `(${DELETION_GRACE_DAYS} days). Download it now from Archives — this cannot be undone.`,
            relatedType: "AcademicYear",
            relatedId: evictedYear,
            link: `/admin/archives?year=${evictedYear}`,
          }).catch(() => null),
        ),
      );
    }

    return NextResponse.json({
      message: `Archived ${archivedTopics} topic(s) and ${archivedInternships} internship(s) for ${year}.`,
      archivedTopics,
      archivedInternships,
      evictedYear,
      scheduledDeleteAt,
    });
  } catch (error) {
    console.error("Year archive failed:", error);
    return NextResponse.json(
      { error: "Failed to archive the academic year." },
      { status: 500 },
    );
  }
}
