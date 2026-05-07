import prisma from '../prisma';
import { MailService } from './mail.service';
import { randomUUID } from 'crypto';

export class NotificationService {
  static async trigger({
    userId,
    type,
    title,
    message,
    relatedId,
    relatedType,
    link,
    skipEmail = false,
  }: {
    userId: string;
    type: string; // Prisma notification_type enum value
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    /** Optional deep link URL shown in the notification (e.g. /student/internship) */
    link?: string;
    skipEmail?: boolean;
  }) {
    try {
      // 1. Persist notification to DB first (NFR-RDI2: track delivery per record)
      const notification = await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: type as never,
          title,
          message,
          relatedId,
          relatedType,
          link,
          // If skipEmail is true, mark it as "already sent" so cron ignores it
          emailSent: skipEmail,
        },
      });

      // 2. Fetch user details for email
      if (skipEmail) return notification;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        try {
          const html = NotificationService._buildEmailHtml(title, message, user.name, link);
          await MailService.sendEmail({ to: user.email, subject: title, html, text: message });

          // Mark email as delivered
          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        } catch (emailError) {
          // NFR-RDI2: email failure is non-fatal — emailSent stays false, cron will retry
          console.error('[Notification] Email delivery failed, will retry via cron:', emailError);
        }
      }

      return notification;
    } catch (error) {
      console.error('[Notification] Creation failed:', error);
    }
  }

  /**
   * NFR-RDI2: Retry sending emails for notifications where emailSent = false.
   * Called by the daily cron job. Skips notifications younger than 5 minutes
   * to avoid re-attempting before the initial call has finished.
   *
   * @param batchSize - Max number of notifications to retry per run (default 50)
   * @returns Number of notifications successfully retried
   */
  static async retryFailedEmails(batchSize = 50): Promise<number> {
    const cutoff = new Date(Date.now() - 5 * 60 * 1000); // older than 5 min

    const failed = await prisma.notification.findMany({
      where: { emailSent: false, createdAt: { lt: cutoff } },
      include: { user: { select: { email: true, name: true } } },
      take: batchSize,
      orderBy: { createdAt: 'asc' },
    });

    let retried = 0;
    for (const n of failed) {
      if (!n.user) continue;
      try {
        const html = NotificationService._buildEmailHtml(n.title, n.message, n.user.name, n.link ?? undefined);
        await MailService.sendEmail({ to: n.user.email, subject: n.title, html, text: n.message });
        await prisma.notification.update({ where: { id: n.id }, data: { emailSent: true } });
        retried++;
      } catch {
        // Still failing — leave emailSent = false for the next cron run
      }
    }
    return retried;
  }

  /** Shared HTML email template */
  private static _buildEmailHtml(
    title: string,
    message: string,
    userName: string,
    link?: string,
  ): string {
    return `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #e1e1e1;">
        <h2 style="color:#4f46e5;text-align:center;">${title}</h2>
        <p>Hello ${userName},</p>
        <p>${message}</p>
        ${
          link
            ? `<p style="text-align:center;margin-top:20px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}${link}"
                   style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">
                  View Details
                </a>
               </p>`
            : ''
        }
        <hr style="margin:30px 0;border:0;border-top:1px solid #e1e1e1;" />
        <p style="text-align:center;color:#9ca3af;font-size:12px;">Official ESST Alger Administrative Portal</p>
      </div>
    `;
  }
}
