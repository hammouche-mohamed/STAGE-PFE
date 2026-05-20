import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: internshipId } = await params;

    const isStudent = await prisma.internshipStudent.findFirst({
      where: { internshipId, studentId: session.user.id },
    });

    const internship = await prisma.internship.findUnique({ where: { id: internshipId } });

    let isAdminAuthorized = false;
    if (session.user.role === "ADMIN") {
      if (session.user.isSuperAdmin) {
        isAdminAuthorized = true;
      } else if (session.user.filiereId) {
        const topic = await prisma.topic.findUnique({
          where: { id: internship?.topicId || "" },
          select: { filiereId: true },
        });
        isAdminAuthorized = topic?.filiereId === session.user.filiereId;
      }
    }

    const isAuthorized =
      isStudent ||
      isAdminAuthorized ||
      internship?.teacherId === session.user.id;

    let isCompanyAuthorized = false;
    if (!isAuthorized && session.user.role === "COMPANY" && internship) {
      const topic = await prisma.topic.findUnique({
        where: { id: internship.topicId },
        select: { proposedById: true },
      });
      isCompanyAuthorized = topic?.proposedById === session.user.id;
    }

    if (!isAuthorized && !isCompanyAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        relatedId: internshipId,
        type: "MESSAGE_RECEIVED",
        isRead: false,
      },
      data: { isRead: true },
    });

    const messages = await prisma.message.findMany({
      where: { internshipId },
      include: { user: { select: { name: true } } },
      orderBy: { sentAt: "asc" },
    });

    // Mark every other-author message as read for this user. The sidebar
    // unread badge counts messages with no MessageRead row for the viewer,
    // so this is what makes the +1 drop the moment they open the chat.
    // `skipDuplicates` makes re-loads (polling) a cheap no-op once read.
    const unreadIds = messages
      .filter((m) => m.senderId !== session.user.id)
      .map((m) => m.id);
    if (unreadIds.length > 0) {
      await prisma.messageRead.createMany({
        data: unreadIds.map((mid) => ({
          id: randomUUID(),
          messageId: mid,
          userId: session.user.id,
        })),
        skipDuplicates: true,
      });
    }

    const formatted = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: { name: (msg as any).user?.name || "Unknown" },
      content: msg.content,
      sentAt: msg.sentAt.toISOString(),
      attachmentUrl: msg.attachmentUrl,
      attachmentName: msg.attachmentName,
      requiresAction: msg.requiresAction,
      actionStatus: msg.actionStatus,
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error("Fetch messages failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const message = await prisma.message.findUnique({
      where: { id },
      include: { user: { select: { name: true } } } as any,
    });
    if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (message.senderId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Rewrite the inline quote prefix on any reply that referenced this message
    // so it shows "deleted message from <sender>" instead of stale quoted text.
    // Replies are stored as `↩ <senderName>: "<snippet>"\n\n<body>` (see client
    // composer) — we reconstruct that exact prefix and swap it for a tombstone.
    const senderName = (message as any).user?.name ?? "User";
    const snippet =
      message.content.slice(0, 60) + (message.content.length > 60 ? "…" : "");
    const quotePrefix = `↩ ${senderName}: "${snippet}"`;
    const tombstonePrefix = `↩ deleted message from ${senderName}`;

    const replies = await prisma.message.findMany({
      where: {
        internshipId: message.internshipId,
        id: { not: id },
        content: { startsWith: quotePrefix },
      },
      select: { id: true, content: true },
    });

    await prisma.$transaction([
      ...replies.map((r) =>
        prisma.message.update({
          where: { id: r.id },
          data: { content: tombstonePrefix + r.content.slice(quotePrefix.length) },
        }),
      ),
      prisma.message.delete({ where: { id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
