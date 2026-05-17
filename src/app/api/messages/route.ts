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
        topic: { select: { proposedById: true } },
        internshipstudent: { select: { studentId: true } },
      } as any,
    });

    if (!internship) {
      return NextResponse.json({ error: "Internship not found." }, { status: 404 });
    }

    const memberIds = [
      internship.teacherId,
      ...(internship as any).internshipstudent.map((s: { studentId: string }) => s.studentId),
    ];

    const isParticipant = memberIds.includes(session.user.id);
    const isAdmin = session.user.role === "ADMIN";
    const isCompany =
      session.user.role === "COMPANY" &&
      (internship as any).topic?.proposedById === session.user.id;

    if (!isParticipant && !isAdmin && !isCompany) {
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
        user: { select: { name: true } },
      } as any,
    });

    const companyId = (internship as any).topic?.proposedById;
    const recipients = [...memberIds, companyId].filter(
      (id, idx, arr) => id && id !== session.user.id && arr.indexOf(id) === idx,
    ) as string[];

    if (recipients.length > 0) {
      const recipientUsers = await prisma.user.findMany({
        where: { id: { in: recipients } },
        select: {
          id: true,
          role: true,
          activeChatInternshipId: true,
          activeChatPingAt: true,
        } as any,
      });

      const presenceCutoff = Date.now() - 45_000;

      for (const r of recipientUsers as any[]) {
        const inThisChat =
          r.activeChatInternshipId === internshipId &&
          r.activeChatPingAt &&
          new Date(r.activeChatPingAt).getTime() >= presenceCutoff;
        if (inThisChat) continue;

        const link =
          r.role === "TEACHER"
            ? "/teacher/messages"
            : r.role === "COMPANY"
              ? "/company/messages"
              : "/student/messages";
        await NotificationService.trigger({
          userId: r.id,
          type: "MESSAGE_RECEIVED",
          title: "New Message",
          message: `${session.user.name}: ${content.trim().substring(0, 60)}${content.length > 60 ? "…" : ""}`,
          relatedId: internshipId,
          relatedType: "Internship",
          link,
          skipEmail: true,
        });
      }
    }

    return NextResponse.json({ data: message }, { status: 201 });
  } catch (error) {
    console.error("[messages POST]", error);
    return NextResponse.json({ error: "Failed to send message. Please try again." }, { status: 500 });
  }
}
