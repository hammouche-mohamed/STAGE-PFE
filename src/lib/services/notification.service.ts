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
  }: {
    userId: string;
    type: string; // Prisma notification_type enum value
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
    /** Optional deep link URL shown in the notification (e.g. /student/internship) */
    link?: string;
  }) {
    try {
      // 1. Persist notification to DB
      const notification = await prisma.notification.create({
        data: {
          id: randomUUID(),
          userId,
          type: type as any,
          title,
          message,
          relatedId,
          relatedType,
          link,
        },
      });

      // 2. Fetch user details for email
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true },
      });

      if (user) {
        try {
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1;">
              <h2 style="color: #4f46e5; text-align: center;">${title}</h2>
              <p>Hello ${user.name},</p>
              <p>${message}</p>
              ${link ? `<p style="text-align:center;margin-top:20px;"><a href="${process.env.NEXT_PUBLIC_APP_URL}${link}" style="background:#4f46e5;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">View Details</a></p>` : ''}
              <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e1e1e1;" />
              <p style="text-align: center; color: #9ca3af; font-size: 12px;">Official ESST Alger Administrative Portal</p>
            </div>
          `;

          await MailService.sendEmail({
            to: user.email,
            subject: title,
            html,
            text: message,
          });

          await prisma.notification.update({
            where: { id: notification.id },
            data: { emailSent: true },
          });
        } catch (emailError) {
          console.error('Email sending failed:', emailError);
          // Email failure is non-fatal — DB notification was already created
        }
      }

      return notification;
    } catch (error) {
      console.error('Notification creation failed:', error);
    }
  }
}
