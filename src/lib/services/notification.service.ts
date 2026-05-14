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
          const html = NotificationService._buildEmailHtml(title, message, user.name, link, type);
          await MailService.sendEmail({
            to: user.email,
            subject: `${title} — ESST Portal`,
            html,
            text: `${title}\n\nHello ${user.name},\n\n${message}${link ? `\n\nOpen the portal: ${process.env.NEXT_PUBLIC_APP_URL || ""}${link}` : ""}`,
          });

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
        const html = NotificationService._buildEmailHtml(
          n.title,
          n.message,
          n.user.name,
          n.link ?? undefined,
          n.type as unknown as string,
        );
        await MailService.sendEmail({
          to: n.user.email,
          subject: `${n.title} — ESST Portal`,
          html,
          text: `${n.title}\n\nHello ${n.user.name},\n\n${n.message}${n.link ? `\n\nOpen the portal: ${process.env.NEXT_PUBLIC_APP_URL || ""}${n.link}` : ""}`,
        });
        await prisma.notification.update({ where: { id: n.id }, data: { emailSent: true } });
        retried++;
      } catch {
        // Still failing — leave emailSent = false for the next cron run
      }
    }
    return retried;
  }

  /**
   * Mark all notifications related to a specific entity as read for all users.
   * Useful when an action is taken that resolves the notification (e.g. approving a request).
   */
  static async clearRelated(relatedId: string, relatedType?: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          relatedId,
          ...(relatedType ? { relatedType } : {}),
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch (error) {
      console.error('[Notification] Failed to clear related notifications:', error);
    }
  }

  /**
   * Mark all notifications of a specific type as read for a specific user.
   */
  static async clearUserNotificationsByType(userId: string, type: string) {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          type: type as any,
          isRead: false,
        },
        data: { isRead: true },
      });
    } catch (error) {
      console.error('[Notification] Failed to clear user notifications by type:', error);
    }
  }

  /**
   * Pick a context-appropriate CTA label based on the notification type.
   * Falls back to "Open in portal" for unknown types.
   */
  private static _ctaLabelForType(type?: string): string {
    if (!type) return "Open in portal";
    if (type.startsWith("DOCUMENT_")) return "Review document";
    if (type.startsWith("MESSAGE_")) return "Open conversation";
    if (type.startsWith("TOPIC_")) return "View topic";
    if (type.startsWith("STUDENT_TOPIC_")) return "View topic";
    if (type.startsWith("REGISTRATION_")) return "View registration";
    if (type.startsWith("APPLICATION_")) return "View application";
    if (type.startsWith("BINOME_")) return "View invitation";
    if (type.startsWith("INTERNSHIP_") || type.startsWith("FINAL_REPORT_")) return "Open internship";
    if (type.startsWith("DEADLINE_") || type === "MINI_PRESENTATION_SCHEDULED" || type === "MINI_PRESENTATION_REMINDER")
      return "View calendar";
    if (type.startsWith("TEACHER_")) return "Open assignment";
    if (type.startsWith("ACCOUNT_") || type === "PASSWORD_RESET") return "Open profile";
    return "Open in portal";
  }

  /**
   * Shared HTML email body. The MailService wraps this in the official
   * branded layout (header/footer), so we only render the inner block here.
   * All user-controlled values are HTML-escaped to prevent stored XSS.
   */
  private static _buildEmailHtml(
    title: string,
    message: string,
    userName: string,
    link?: string,
    type?: string,
  ): string {
    const safeTitle = MailService.escape(title);
    const safeName = MailService.escape(userName);
    const safeMessage = MailService.escapeAndBr(message);
    const cta = MailService.escape(NotificationService._ctaLabelForType(type));
    const safeLink = link ? `${process.env.NEXT_PUBLIC_APP_URL || ""}${link}` : "";

    return `
      <h2 style="color:#1e293b;margin:0 0 16px;font-size:22px;font-weight:600;">${safeTitle}</h2>
      <p style="color:#475569;font-size:15px;margin:0 0 16px;">Hello ${safeName},</p>
      <p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 28px;">${safeMessage}</p>
      ${
        safeLink
          ? `<div style="text-align:left;">
              <a href="${MailService.escape(safeLink)}"
                 style="display:inline-block;background:#4f46e5;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
                ${cta}
              </a>
             </div>`
          : ""
      }
    `;
  }
}
