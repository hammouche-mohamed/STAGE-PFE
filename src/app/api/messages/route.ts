import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";

const MAX_MESSAGE_LENGTH = 2000;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { internshipId, content, attachmentUrl, attachmentName, attachmentSize, requiresAction, actionType } = await req.json();

    // NFR-S5: validate required fields
    if (!internshipId) {
      return NextResponse.json({ error: "internshipId is required." }, { status: 400 });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return NextResponse.json({ error: "Message content cannot be empty." }, { status: 400 });
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message is too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` },
        { status: 400 },
      );
    }

    // NFR-S2: verify sender belongs to this internship
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      select: {
        teacherId: true,
        students: { select: { studentId: true } },
      },
    });

    if (!internship) {
      return NextResponse.json({ error: "Internship not found." }, { status: 404 });
    }

    const memberIds = [
      internship.teacherId,
      ...internship.students.map((s: { studentId: string }) => s.studentId),
    ];
    if (!memberIds.includes(session.user.id)) {
      return NextResponse.json({ error: "You are not a participant in this internship." }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        id: randomUUID(),
        internshipId,
        senderId: session.user.id,
        content: content.trim(),
        attachmentUrl,
        attachmentName,
        attachmentSize,
        requiresAction: !!requiresAction,
        actionType,
        actionStatus: requiresAction ? "PENDING" : undefined,
      },
      include: {
        sender: { select: { name: true } },
      },
    });

    // Notify other participants (except sender)
    const recipients = memberIds.filter((id) => id && id !== session.user.id);

    for (const userId of recipients) {
      if (!userId) continue;
      await NotificationService.trigger({
        userId,
        type: "MESSAGE_RECEIVED",
        title: "New Message",
        message: `${session.user.name}: ${content.trim().substring(0, 60)}${content.length > 60 ? "…" : ""}`,
        relatedId: internshipId,
        relatedType: "Internship",
        skipEmail: true,
      });
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error("[messages POST]", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
