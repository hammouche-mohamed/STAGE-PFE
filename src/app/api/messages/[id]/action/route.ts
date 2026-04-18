import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const message = await prisma.message.findUnique({
      where: { id },
      include: { internship: true }
    });

    if (!message || !message.requiresAction) {
      return NextResponse.json({ error: "Message not actionable" }, { status: 404 });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: {
        actionStatus: status,
        actionById: session.user.id,
      }
    });

    // If it was a DOCUMENT_APPROVAL for an agreement
    if (message.actionType === "DOCUMENT_APPROVAL" && status === "APPROVED") {
      // Potentially advance some validation step
      // For now, log it
    }

    await AuditService.log({
      userId: session.user.id,
      action: "DOCUMENT_ACTION_TAKEN",
      targetType: "Message",
      targetId: message.actionType || "Action Item",
      details: { status },
    });

    return NextResponse.json({ data: updatedMessage });
  } catch (error) {
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
