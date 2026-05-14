import prisma from '@/lib/prisma';
import { differenceInDays } from 'date-fns';
import { NotificationService } from './notification.service';

/** Days before midterm deadline to send reminder (PFE only) */
const MIDTERM_REMIND_DAYS = 3;
/** Days before final deadline to send reminder (all types) */
const FINAL_REMIND_DAYS = 7;

export class DeadlineService {
  /**
   * Checks all active internships and sends upcoming deadline reminders.
   * Called by the daily cron job at /api/cron/reminders.
   *
   * Rules:
   * - 3 days before midtermDeadline → remind student + teacher (PFE only)
   *   Skip entirely if midtermDeadline is null (NORMAL internships)
   * - 7 days before finalDeadline   → remind student + teacher + admin
   */
  static async sendUpcomingReminders() {
    const now = new Date();

    // Fetch all active internships with deadline data
    const internships = await prisma.internship.findMany({
      where: { status: 'IN_PROGRESS' },
      include: {
        internshipstudent: { select: { studentId: true } },
        user: { select: { id: true } },
        topic: { select: { title: true } },
      },
    });

    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    let midtermReminders = 0;
    let finalReminders = 0;

    for (const internship of internships) {
      const studentIds = internship.internshipstudent.map((s) => s.studentId);
      const title = internship.topic.title;

      // ── Midterm reminder (PFE only, skip if null) ──────────────────────────
      if (internship.midtermDeadline && internship.internshipType === 'PFE') {
        const daysUntilMidterm = differenceInDays(internship.midtermDeadline, now);

        if (daysUntilMidterm === MIDTERM_REMIND_DAYS) {
          const recipients = [...studentIds, internship.teacherId];
          for (const userId of recipients) {
            await NotificationService.trigger({
              userId,
              type: 'DEADLINE_REMINDER',
              title: 'Mid-term Report Due in 3 Days',
              message: `The mid-term report for "${title}" is due on ${internship.midtermDeadline.toLocaleDateString()}.`,
              relatedId: internship.id,
              relatedType: 'Internship',
              link: '/student/documents',
            });
          }
          midtermReminders++;
        }
      }
      // NORMAL internships: midtermDeadline is null → never reminded

      // ── Final report reminder (all types) ─────────────────────────────────
      if (internship.finalDeadline) {
        const daysUntilFinal = differenceInDays(internship.finalDeadline, now);

        if (daysUntilFinal === FINAL_REMIND_DAYS) {
          // Notify students + teacher + all admins
          const recipients = [
            ...studentIds,
            internship.teacherId,
            ...adminUsers.map((a) => a.id),
          ];

          for (const userId of recipients) {
            await NotificationService.trigger({
              userId,
              type: 'DEADLINE_REMINDER',
              title: 'Final Report Due in 7 Days',
              message: `The final report for "${title}" is due on ${internship.finalDeadline.toLocaleDateString()}.`,
              relatedId: internship.id,
              relatedType: 'Internship',
              link: '/student/documents',
            });
          }
          finalReminders++;
        }
      }
    }

    return { midtermReminders, finalReminders, processed: internships.length };
  }
}
