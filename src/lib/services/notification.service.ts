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
            text: `${title}\n\nHello ${user.name},\n\n${message}${link ? `\n\nOpen the portal: ${NotificationService.absoluteUrl(link)}` : ""}`,
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
   * Deliver the same notification to every member of a student team — leader
   * AND every other member — so a binôme partner is never left out of an
   * acceptance/rejection/deadline message. For a solo student (team of one)
   * only that single member is notified, matching the "alone → only him"
   * rule. Falls back gracefully if the team has no members.
   */
  static async triggerTeam(args: {
    teamId: string | null | undefined;
    type: string;
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    link?: string;
    skipEmail?: boolean;
  }) {
    if (!args.teamId) return [];
    const { teamId, ...payload } = args;
    try {
      const members = await prisma.teamMember.findMany({
        where: { teamId },
        select: { studentId: true },
      });
      const ids = Array.from(new Set(members.map((m) => m.studentId).filter(Boolean)));
      return Promise.all(
        ids.map((userId) =>
          NotificationService.trigger({ ...payload, userId }).catch(() => null),
        ),
      );
    } catch (error) {
      console.error('[Notification] triggerTeam failed:', error);
      return [];
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
          text: `${n.title}\n\nHello ${n.user.name},\n\n${n.message}${n.link ? `\n\nOpen the portal: ${NotificationService.absoluteUrl(n.link)}` : ""}`,
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
  /**
   * Always returns an ABSOLUTE url for emails. A relative path is a dead
   * link in mail clients (no base URL), so fall back through every known
   * source and finally the production domain — never emit a relative href.
   */
  static absoluteUrl(link?: string): string {
    if (!link) return "";
    const PROD_URL = "https://esst-internship.vercel.app";
    // A localhost/relative href is a dead link in a recipient's inbox. Never
    // emit one: ignore any env value that points at localhost and fall back
    // through the remaining sources to the production domain.
    const isLocal = (u: string) => /localhost|127\.0\.0\.1|0\.0\.0\.0/i.test(u);
    if (/^https?:\/\//i.test(link)) {
      return isLocal(link) ? `${PROD_URL}/${link.replace(/^https?:\/\/[^/]+\/?/i, "")}` : link;
    }
    const candidate =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const base = (candidate && !isLocal(candidate) ? candidate : PROD_URL).replace(/\/+$/, "");
    return `${base}/${String(link).replace(/^\/+/, "")}`;
  }

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
    const url = NotificationService.absoluteUrl(link);
    const safeUrl = MailService.escape(url);

    return `
      <h2 style="color:#0f172a;margin:0 0 16px;font-size:22px;font-weight:700;">${safeTitle}</h2>
      <p style="color:#475569;font-size:15px;margin:0 0 14px;">Hello ${safeName},</p>
      <p style="color:#334155;font-size:15px;line-height:1.65;margin:0 0 28px;">${safeMessage}</p>
      ${
        url
          ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 22px;">
              <tr>
                <td style="border-radius:6px;background-color:#1e293b;">
                  <a href="${safeUrl}"
                     style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:.2px;border-radius:6px;">
                    ${cta} &rarr;
                  </a>
                </td>
              </tr>
            </table>
            <p style="color:#94a3b8;font-size:12px;margin:0;line-height:1.5;">
              Button not working? Copy and paste this link:<br/>
              <a href="${safeUrl}" style="color:#6366f1;word-break:break-all;">${safeUrl}</a>
            </p>`
          : ""
      }
    `;
  }
}
