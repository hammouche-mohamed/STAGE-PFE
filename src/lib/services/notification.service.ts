import prisma from "../prisma";
import { MailService } from "./mail.service";

export class NotificationService {
  static async trigger({
    userId,
    type,
    title,
    message,
    relatedId,
    relatedType,
  }: {
    userId: string;
    type: any; // Type from Prisma enum NotificationType
    title: string;
    message: string;
    relatedId?: string;
    relatedType?: string;
  }) {
    try {
      // 1. Create database notification
      const notification = await prisma.notification.create({
        data: {
          userId,
          type,
          title,
          message,
          relatedId,
          relatedType,
        },
      });

      // 2. Fetch user email for MailService
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (user) {
        try {
          // Simple HTML template for generic notifications
          const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e1e1;">
              <h2 style="color: #4f46e5; text-align: center;">${title}</h2>
              <p>Hello ${user.name},</p>
              <p>${message}</p>
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
            data: { emailSent: true }
          });
        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }

      return notification;
    } catch (error) {
      console.error("Notification creation failed:", error);
    }
  }
}
