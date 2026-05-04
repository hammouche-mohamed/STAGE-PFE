import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/cron/archive
// Purges all records from academic years older than 3 years.
// Protected by CRON_SECRET header.
// Schedule: 0 3 1 9 * (3am on 1st September each year)
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Calculate cutoff: current year minus 3 years
  // Academic year format: "2024-2025" → start year = 2024
  const currentYear = new Date().getFullYear();
  const cutoffStartYear = currentYear - 3; // e.g., in 2026 → delete years starting before 2023

  // Build list of years to delete (format: "YYYY-YYYY+1")
  const yearsToDelete: string[] = [];
  for (let y = cutoffStartYear - 5; y < cutoffStartYear; y++) {
    yearsToDelete.push(`${y}-${y + 1}`);
  }

  if (yearsToDelete.length === 0) {
    return NextResponse.json({ message: 'Nothing to archive.' });
  }

  console.log(`[cron/archive] Purging academic years: ${yearsToDelete.join(', ')}`);

  const results: Record<string, number> = {};

  try {
    // Order matters — delete children before parents

    // 1. Messages (via internship → academicYear)
    const internshipsToDelete = await prisma.internship.findMany({
      where: { academicYear: { in: yearsToDelete } },
      select: { id: true },
    });
    const internshipIds = internshipsToDelete.map((i) => i.id);

    if (internshipIds.length > 0) {
      // Messages
      const msgs = await prisma.message.deleteMany({
        where: { internshipId: { in: internshipIds } },
      });
      results.messages = msgs.count;

      // Message reads
      await prisma.messageRead.deleteMany({ where: { message: { internshipId: { in: internshipIds } } } });

      // Documents
      const docs = await prisma.document.deleteMany({
        where: { internshipId: { in: internshipIds } },
      });
      results.documents = docs.count;


      // Deadlines (internship-level)
      await prisma.deadline.deleteMany({ where: { internshipId: { in: internshipIds } } });

      // InternshipStudents
      await prisma.internshipStudent.deleteMany({ where: { internshipId: { in: internshipIds } } });

      // MiniPresentations
      await prisma.miniPresentation.deleteMany({ where: { internshipId: { in: internshipIds } } });

      // Internships
      const ints = await prisma.internship.deleteMany({
        where: { id: { in: internshipIds } },
      });
      results.internships = ints.count;
    }

    // 2. Topics (by academicYear)
    const topicsToDelete = await prisma.topic.findMany({
      where: { academicYear: { in: yearsToDelete } },
      select: { id: true },
    });
    const topicIds = topicsToDelete.map((t) => t.id);

    if (topicIds.length > 0) {
      await prisma.studentApplication.deleteMany({ where: { topicId: { in: topicIds } } });
      await prisma.teacherApplication.deleteMany({ where: { topicId: { in: topicIds } } });
      const tops = await prisma.topic.deleteMany({ where: { id: { in: topicIds } } });
      results.topics = tops.count;
    }

    // 3. Audit logs older than 3 years
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 3);
    const auditDeleted = await prisma.auditLog.deleteMany({
      where: { createdAt: { lt: cutoffDate } },
    });
    results.auditLogs = auditDeleted.count;

    // 4. Old notifications (older than 1 year — keep DB lean)
    const notifCutoff = new Date();
    notifCutoff.setFullYear(notifCutoff.getFullYear() - 1);
    const notifsDeleted = await prisma.notification.deleteMany({
      where: { createdAt: { lt: notifCutoff } },
    });
    results.notifications = notifsDeleted.count;

    const summary = Object.entries(results)
      .map(([k, v]) => `${v} ${k}`)
      .join(', ');

    console.log(`[cron/archive] Purged: ${summary}`);

    return NextResponse.json({
      message: `Archive complete. Purged: ${summary}`,
      yearsDeleted: yearsToDelete,
      counts: results,
    });
  } catch (error) {
    console.error('[cron/archive] Error:', error);
    return NextResponse.json({ error: 'Archive failed' }, { status: 500 });
  }
}
