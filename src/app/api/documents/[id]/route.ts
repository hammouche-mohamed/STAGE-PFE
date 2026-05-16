import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { unlink } from "fs/promises";
import { join } from "path";

const VALID_REVIEW_STATUSES = new Set(["APPROVED", "REJECTED", "NEEDS_REVISION"]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const { status, reviewComment } = await req.json();

    // NFR-S5: validate the review status value
    if (!VALID_REVIEW_STATUSES.has(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${[...VALID_REVIEW_STATUSES].join(", ")}.` },
        { status: 400 },
      );
    }

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        internship: {
          select: {
            teacherId: true,
            topic: { select: { proposedById: true } },
          },
        },
      },
    });

    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const isTeacher = document.internship.teacherId === session.user.id;
    const isCompany = document.internship.topic?.proposedById === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isTeacher && !isCompany && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        status,
        reviewComment,
        reviewedById: session.user.id,
      }
    });

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
      targetId: document.fileName,
      details: { status, comment: reviewComment }
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('[documents/[id] PATCH]', error);
    return NextResponse.json({ error: "Failed to update document. Please try again." }, { status: 500 });
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

    const document = await prisma.document.findUnique({
      where: { id }
    });

    if (!document) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const isOwner = document.uploadedById === session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    if (!isOwner && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    try {
      const filePath = join(process.cwd(), "public", document.fileUrl);
      await unlink(filePath);
    } catch {
      console.warn(`[documents] Could not delete file from disk: ${document.fileUrl}`);
    }

    await prisma.document.delete({ where: { id } });

    await AuditService.log({
      userId: session.user.id,
      action: "DOCUMENT_DELETED",
      targetType: "Document",
      targetId: document.fileName,
      details: { type: document.type, version: document.version }
    });

    return NextResponse.json({ message: "Document deleted successfully." });
  } catch (error) {
    console.error("Document deletion failed:", error);
    return NextResponse.json({ error: "Failed to delete document. Please try again." }, { status: 500 });
  }
}
