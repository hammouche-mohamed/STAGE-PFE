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
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const { status, reviewComment } = await req.json();

    const document = await prisma.document.findUnique({
      where: { id },
      include: { internship: true }
    });

    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Authorization: Only teacher of internship or Admin can review
    const isTeacher = document.internship.teacherId === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isTeacher && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status,
        reviewComment,
        reviewedById: session.user.id,
      }
    });

    // Notify uploader
    await NotificationService.trigger({
      userId: document.uploadedById,
      type: status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
      title: `Document ${status.toLowerCase()}`,
      message: `${session.user.name} has ${status.toLowerCase()} your document: ${document.fileName}. ${reviewComment ? `Comment: ${reviewComment}` : ""}`,
      relatedId: document.id,
      relatedType: "Document",
    });

    await AuditService.log({
      userId: session.user.id,
      action: "DOCUMENT_REVIEWED",
      targetType: "Document",
      targetId: id,
      details: { status, comment: reviewComment }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
