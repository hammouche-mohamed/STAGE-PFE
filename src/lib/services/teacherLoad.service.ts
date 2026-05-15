import prisma from "@/lib/prisma";
import { NotificationService } from "@/lib/services/notification.service";

export class TeacherLoadService {
  /**
   * Notify the teacher (in-app + email) the moment their load reaches the
   * max — i.e. the load just crossed from "below max" to "at/over max".
   * Only fires on the transition so we never spam on every increment.
   */
  private static async _notifyIfJustFull(
    teacherId: string,
    oldLoad: number,
    newLoad: number,
    maxStudents: number,
  ) {
    if (oldLoad < maxStudents && newLoad >= maxStudents) {
      try {
        await NotificationService.trigger({
          userId: teacherId,
          type: "ACCOUNT_MODIFIED",
          title: "Maximum supervision capacity reached",
          message:
            `You are now supervising ${newLoad} of your maximum ${maxStudents} ` +
            `team(s). You won't be offered new topics and can't request more ` +
            `supervisions until one of your current internships finishes.`,
          link: "/teacher/internships",
          relatedType: "TeacherProfile",
          relatedId: teacherId,
        });
      } catch (e) {
        // Notifying is best-effort — never block the load update on it.
        console.error("[TeacherLoad] capacity notification failed:", e);
      }
    }
  }

  static async increment(teacherId: string) {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: teacherId } });
    if (!profile) return;
    const newLoad = profile.currentLoad + 1;
    await prisma.teacherProfile.update({
      where: { userId: teacherId },
      data: {
        currentLoad: newLoad,
        isAvailable: newLoad < profile.maxStudents,
      },
    });
    await TeacherLoadService._notifyIfJustFull(
      teacherId,
      profile.currentLoad,
      newLoad,
      profile.maxStudents,
    );
  }

  static async decrement(teacherId: string) {
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: teacherId } });
    if (!profile) return;
    const newLoad = Math.max(0, profile.currentLoad - 1);
    await prisma.teacherProfile.update({
      where: { userId: teacherId },
      data: {
        currentLoad: newLoad,
        isAvailable: newLoad < profile.maxStudents,
      },
    });
  }

  static async recompute(teacherId: string) {
    // Count active internships directly
    const count = await prisma.internship.count({
      where: {
        teacherId,
        status: { in: ["APPROVED", "IN_PROGRESS"] },
      },
    });
    const profile = await prisma.teacherProfile.findUnique({ where: { userId: teacherId } });
    if (!profile) return;
    await prisma.teacherProfile.update({
      where: { userId: teacherId },
      data: {
        currentLoad: count,
        isAvailable: count < profile.maxStudents,
      },
    });
    await TeacherLoadService._notifyIfJustFull(
      teacherId,
      profile.currentLoad,
      count,
      profile.maxStudents,
    );
  }
}
