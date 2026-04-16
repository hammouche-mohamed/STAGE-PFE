import prisma from "@/lib/prisma";

export class TeacherLoadService {
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
  }
}
