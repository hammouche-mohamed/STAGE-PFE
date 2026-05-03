import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { internshipId, content, attachmentUrl, attachmentName, attachmentSize, requiresAction, actionType } = await req.json();

    const message = await prisma.message.create({
      data: {
        id: randomUUID(),
        internshipId,
        senderId: session.user.id,
        content,
        attachmentUrl,
        attachmentName,
        attachmentSize,
        requiresAction: !!requiresAction,
        actionType,
        actionStatus: requiresAction ? "PENDING" : undefined,
      },
      include: {
        sender: { select: { name: true } },
      }
    });

    // Notify other participants (except sender)
    const participants = await prisma.internshipStudent.findMany({
      where: { internshipId },
      select: { studentId: true }
    });

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      select: { teacherId: true }
    });

    const recipients = [
      ...participants.map(p => p.studentId),
      internship?.teacherId
    ].filter(id => id && id !== session.user.id);

    for (const userId of recipients) {
      if (!userId) continue;
      await NotificationService.trigger({
        userId,
        type: "MESSAGE_RECEIVED",
        title: "New Message",
        message: `${session.user.name}: ${content.substring(0, 50)}...`,
        relatedId: internshipId,
        relatedType: "Internship",
      });
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
