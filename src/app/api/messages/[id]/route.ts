import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: internshipId } = await params;

    // Verify participation
    const isStudent = await prisma.internshipStudent.findFirst({
      where: { internshipId, studentId: session.user.id }
    });

    const internship = await prisma.internship.findUnique({
      where: { id: internshipId }
    });

    const isAuthorized = 
      isStudent || 
      session.user.role === "ADMIN" || 
      internship?.teacherId === session.user.id;
      // Also company supervisor check could be added if Topic is linked

    if (!isAuthorized) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { internshipId },
      include: {
        sender: { select: { name: true } },
      },
      orderBy: { sentAt: "asc" },
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      senderName: msg.sender.name,
      content: msg.content,
      sentAt: msg.sentAt.toISOString(),
      attachmentUrl: msg.attachmentUrl,
      attachmentName: msg.attachmentName,
      requiresAction: msg.requiresAction,
      actionStatus: msg.actionStatus,
    }));

    return NextResponse.json({ data: formattedMessages });
  } catch (error) {
    console.error("Fetch messages failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
