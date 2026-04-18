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
    const { internshipId, type, fileName, fileUrl, fileSize } = await req.json();

    // 1. Verify access to internship
    const participation = await prisma.internshipStudent.findFirst({
      where: { internshipId, studentId: session.user.id }
    });
    
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId }
    });

    const isAuthorized = participation || session.user.role === "ADMIN" || internship?.teacherId === session.user.id;
    if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 2. Determine version (simple increment for same type)
    const lastDoc = await prisma.document.findFirst({
      where: { internshipId, type },
      orderBy: { version: "desc" }
    });
    const version = lastDoc ? lastDoc.version + 1 : 1;

    // 3. Create document record
    const document = await prisma.document.create({
      data: {
        id: randomUUID(),
        internshipId,
        uploadedById: session.user.id,
        type,
        fileName,
        fileUrl,
        fileSize,
        version,
        status: "UPLOADED",
      }
    });

    // 4. Notify others in the group
    // In a real app, we'd notify the teacher if a student uploads, and vice versa
    const recipients = [];
    if (session.user.role === "STUDENT") {
      if (internship?.teacherId) recipients.push(internship.teacherId);
    } else if (session.user.role === "TEACHER") {
      const students = await prisma.internshipStudent.findMany({ where: { internshipId } });
      recipients.push(...students.map(s => s.studentId));
    }

    for (const rid of recipients) {
      await NotificationService.trigger({
        userId: rid,
        type: "DOCUMENT_UPLOADED",
        title: "New Document Uploaded",
        message: `${session.user.name} uploaded ${fileName} (v${version})`,
        relatedId: document.id,
        relatedType: "Document",
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "DOCUMENT_UPLOADED",
      targetType: "Document",
      targetId: fileName,
      details: { fileName, type, version }
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error("Document creation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const internshipId = searchParams.get("internshipId");

  if (!internshipId) return NextResponse.json({ error: "InternshipId required" }, { status: 400 });

  try {
    const documents = await prisma.document.findMany({
      where: { internshipId },
      include: {
        uploadedBy: { select: { name: true } },
      },
      orderBy: [{ type: "asc" }, { version: "desc" }]
    });

    return NextResponse.json({ data: documents });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
