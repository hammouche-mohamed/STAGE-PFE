import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { internshipId, scheduledAt, room, timeSlot, juryMembers } = await req.json();

    // juryMembers: array of { userId, role, isAdvisory }
    
    const defense = await prisma.$transaction(async (tx) => {
      // 1. Create Defense
      const def = await tx.defense.create({
        data: {
          id: randomUUID(),
          internshipId,
          scheduledAt: new Date(scheduledAt),
          room,
          timeSlot,
          status: "SCHEDULED",
        }
      });

      // 2. Create Jury Members
      await tx.juryMember.createMany({
        data: juryMembers.map((m: any) => ({
          defenseId: def.id,
          userId: m.userId,
          role: m.role,
          isAdvisory: !!m.isAdvisory,
        }))
      });

      return def;
    });

    // 3. Notify Student(s), Teacher, and Jury
    const students = await prisma.internshipStudent.findMany({ where: { internshipId } });
    const recipients = [
      ...students.map(s => s.studentId),
      ...juryMembers.map((m: any) => m.userId)
    ];

    for (const rid of recipients) {
      await NotificationService.trigger({
        userId: rid,
        type: "DEFENSE_SCHEDULED",
        title: "PFE Defense Scheduled",
        message: `Your PFE defense is scheduled for ${new Date(scheduledAt).toLocaleDateString()} in room ${room} (Time: ${timeSlot}).`,
        relatedId: defense.id,
        relatedType: "Defense",
      });
    }

    // 4. Log the action with topic title
    const topic = await prisma.topic.findFirst({
      where: { internship: { id: internshipId } },
      select: { title: true }
    });

    await AuditService.log({
      userId: session.user.id,
      action: "DEFENSE_SCHEDULED",
      targetType: "Defense",
      targetId: topic?.title || internshipId,
      details: { room, timeSlot, scheduledAt }
    });

    return NextResponse.json({ data: defense }, { status: 201 });
  } catch (error) {
    console.error("Defense scheduling failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;

  try {
    const defenses = await prisma.defense.findMany({
      where: {
        ...(role === "STUDENT" && { internship: { students: { some: { studentId: session.user.id } } } }),
        ...(role === "TEACHER" && { 
          OR: [
            { internship: { teacherId: session.user.id } },
            { juryMembers: { some: { userId: session.user.id } } }
          ]
        }),
      },
      include: {
        internship: {
          include: {
            topic: { select: { title: true } },
            students: { include: { student: { select: { name: true } } } },
          }
        },
        juryMembers: { include: { user: { select: { name: true } } } },
      },
      orderBy: { scheduledAt: "asc" }
    });

    return NextResponse.json({ data: defenses });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
