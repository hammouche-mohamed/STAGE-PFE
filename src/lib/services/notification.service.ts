import prisma from "../prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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

      // 2. Fetch user email for Resend
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true }
      });

      if (user && process.env.RESEND_API_KEY) {
        // In a real scenario, we would use a React Email template here
        // For now, we'll log the intention or send a simple text version
        try {
          await resend.emails.send({
            from: process.env.FROM_EMAIL || "onboarding@resend.dev",
            to: user.email,
            subject: title,
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
