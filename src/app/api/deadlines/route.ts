import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { SettingsService } from "@/lib/services/settings.service";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { title, type, dueDate, internshipId, isGlobal, academicYear } = await req.json();

    const deadline = await prisma.deadline.create({
      data: {
        id: randomUUID(),
        title,
        type,
        dueDate: new Date(dueDate),
        internshipId,
        isGlobal: !!isGlobal,
        academicYear,
        createdById: session.user.id,
      }
    });
    if (isGlobal) {
    } else if (internshipId) {
      const students = await prisma.internshipStudent.findMany({ where: { internshipId } });
      const internship = await prisma.internship.findUnique({ where: { id: internshipId } });

      const recipients = [...students.map(s => s.studentId)];
      if (internship?.teacherId) recipients.push(internship.teacherId);

      for (const uid of recipients) {
        await NotificationService.trigger({
          userId: uid,
          type: "DEADLINE_APPROACHING",
          title: `New Deadline: ${title}`,
          message: `A new deadline has been set for your internship: ${title} due on ${new Date(dueDate).toLocaleString()}.`,
          relatedId: deadline.id,
          relatedType: "Deadline",
        });
      }
    }

    await AuditService.log({
      userId: session.user.id,
      action: "DEADLINE_CREATED",
      targetType: "Deadline",
      targetId: deadline.title,
      details: { title, type, isGlobal }
    });

    return NextResponse.json({ data: deadline }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const internshipId = searchParams.get("internshipId");
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get("academicYear") || defaultYear;

  try {
    const deadlines = await prisma.deadline.findMany({
      where: {
        AND: [
          { academicYear },
          {
            OR: [
              { isGlobal: true },
              ...(internshipId ? [{ internshipId }] : []),
            ]
          }
        ]
      },
      orderBy: { dueDate: "asc" }
    });

    return NextResponse.json({ data: deadlines });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
