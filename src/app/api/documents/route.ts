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
    const internship = await prisma.internship.findUnique({
      where: { id: internshipId },
      include: { topic: true }
    });

    if (!internship) return NextResponse.json({ error: "Internship not found" }, { status: 404 });

    const participation = await prisma.internshipStudent.findFirst({
      where: { internshipId, studentId: session.user.id }
    });

    let isAdminAuthorized = false;
    if (session.user.role === "ADMIN") {
      if (session.user.isSuperAdmin) {
        isAdminAuthorized = true;
      } else if (session.user.filiereId && internship.topic?.filiereId === session.user.filiereId) {
        isAdminAuthorized = true;
      }
    }

    const isCompanyOwner = session.user.role === "COMPANY" && internship.topic?.proposedById === session.user.id;
    const isTeacher = internship.teacherId === session.user.id;
    const isStudent = !!participation;

    const isAuthorized = isStudent || isAdminAuthorized || isTeacher || isCompanyOwner;
    if (!isAuthorized) return NextResponse.json({ error: "Forbidden" }, { status: 403 });


    const [documents, milestones] = await Promise.all([
      prisma.document.findMany({
        where: { internshipId },
        include: {
          uploadedBy: { select: { name: true } },
        },
        orderBy: [{ type: "asc" }, { version: "desc" }],
      }),
      // Milestone submissions live on `minipresentation`, not `document`. Merge
      // the submitted ones in as virtual document rows so they show up in the
      // same table for every role (student, teacher, admin, company).
      prisma.miniPresentation.findMany({
        where: { internshipId, documentUrl: { not: null } },
        include: {
          internship: {
            select: {
              internshipstudent: {
                select: { user: { select: { id: true, name: true } } },
              },
            },
          },
        } as any,
      }),
    ]);

    const formattedDocuments = documents.map((doc) => ({
      ...doc,
      uploadedBy: doc.uploadedBy,
    }));

    // The MiniPresentation row doesn't track who uploaded — every team
    // member is on the hook for the milestone, so attribute it to the first
    // student on the team (just for display). Cast through `any` because the
    // shape is intentionally document-like but synthesized, not a real row.
    const milestoneDocuments = (milestones as any[])
      .filter((m) => m.documentUrl && m.documentName)
      .map((m) => {
        const firstStudent = m.internship?.internshipstudent?.[0]?.user;
        return {
          id: `milestone-${m.id}`,
          internshipId: m.internshipId,
          uploadedById: firstStudent?.id ?? "",
          type: "MILESTONE",
          fileName: m.documentName,
          fileUrl: m.documentUrl,
          fileSize: 0,
          version: 1,
          status:
            m.status === "REVIEWED"
              ? "REVIEWED"
              : m.status === "MISSED"
                ? "REJECTED"
                : "UPLOADED",
          reviewComment: m.adminComment ?? null,
          reviewedById: null,
          approvedByTeacher: false,
          approvedByCompany: false,
          reviewedByCompany: null,
          companyComment: null,
          uploadedBy: firstStudent ? { name: firstStudent.name } : { name: "Team" },
          uploadedAt: m.submittedAt ?? m.createdAt,
          // Bonus context for the UI — non-Document fields tagged with the
          // milestone title so future renderers can label these as milestones.
          milestoneTitle: m.title,
        };
      });

    return NextResponse.json({
      data: [...formattedDocuments, ...milestoneDocuments],
    });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
