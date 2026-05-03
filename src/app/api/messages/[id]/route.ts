import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// ─── GET /api/messages/[id] ───────────────────────────────────────────────────
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

    const isAuthorized =
      isStudent ||
      session.user.role === "ADMIN" ||
      internship?.teacherId === session.user.id;

    // Company: allow if they own the topic
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

    const messages = await prisma.message.findMany({
      where: { internshipId },
      include: { sender: { select: { name: true } } },
      orderBy: { sentAt: "asc" },
    });

    const formatted = messages.map((msg) => ({
      id: msg.id,
      senderId: msg.senderId,
      sender: { name: msg.sender.name },
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

// ─── DELETE /api/messages/[id] ────────────────────────────────────────────────
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const message = await prisma.message.findUnique({ where: { id } });
    if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (message.senderId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.message.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
