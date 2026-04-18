import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { internshipSchema } from "@/lib/validations/internship.schema";
import { AuditService } from "@/lib/services/audit.service";
import { TeacherLoadService } from "@/lib/services/teacherLoad.service";
import { NotificationService } from "@/lib/services/notification.service";
import { SettingsService } from "@/lib/services/settings.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get("academicYear") || defaultYear;
  const role = session.user.role;

  try {
    const where: any = { academicYear };

    if (role === "STUDENT") {
      where.students = { some: { studentId: session.user.id } };
    } else if (role === "TEACHER") {
      where.teacherId = session.user.id;
    } else if (role === "COMPANY") {
      where.topic = { proposedById: session.user.id };
    }
    // ADMIN sees all

    const internships = await prisma.internship.findMany({
      where,
      include: {
        topic: { select: { title: true, type: true } },
        teacher: { select: { name: true } },
        students: { include: { student: { select: { name: true, email: true } } } },
        _count: { select: { documents: true, messages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: internships });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { topicId, teacherId, academicYear, studentIds } = internshipSchema.parse(body);

    // Enforce max 2 students
    if (studentIds.length > 2) {
      return NextResponse.json({ error: "Maximum 2 students per internship" }, { status: 409 });
    }

    // Check teacher capacity
    const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: teacherId } });
    if (!teacherProfile || teacherProfile.currentLoad >= teacherProfile.maxStudents) {
      return NextResponse.json({ error: "Teacher is at full capacity" }, { status: 409 });
    }

    const internship = await prisma.$transaction(async (tx) => {
      const created = await tx.internship.create({
        data: {
          topicId,
          teacherId,
          academicYear,
          status: "APPROVED",
          students: {
            create: studentIds.map((sid, i) => ({
              studentId: sid,
              isLeader: i === 0,
            })),
          },
        },
        include: { students: { include: { student: { select: { id: true, name: true } } } } },
      });

      await tx.topic.update({
        where: { id: topicId },
        data: { status: "TAKEN" },
      });

      return created;
    });

    // Increment teacher load
    await TeacherLoadService.increment(teacherId);

    // Notify all parties
    const recipientIds = internship.students.map(s => s.studentId);
    recipientIds.push(teacherId);

    for (const uid of recipientIds) {
      await NotificationService.trigger({
        userId: uid,
        type: "INTERNSHIP_STARTED",
        title: "Internship record created",
        message: "Your internship has been officially created and approved by the administration.",
        relatedId: internship.id,
        relatedType: "Internship",
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "INTERNSHIP_CREATED",
      targetType: "Internship",
      targetId: internship.id,
    });

    return NextResponse.json({ data: internship }, { status: 201 });
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
