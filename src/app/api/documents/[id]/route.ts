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

    // Milestone documents are synthesized rows ("milestone-<uuid>") that live
    // on MiniPresentation, not Document. Route them to their own update path
    // so the supervisor's approve/reject lands on the right table. Only the
    // academic supervisor reviews milestones — admins and companies are not
    // in the loop here.
    if (id.startsWith("milestone-")) {
      const milestoneId = id.slice("milestone-".length);
      const milestone = await prisma.miniPresentation.findUnique({
        where: { id: milestoneId },
        include: {
          internship: {
            select: {
              teacherId: true,
              internshipstudent: { select: { studentId: true } },
            },
          },
        },
      });
      if (!milestone) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      if (milestone.internship.teacherId !== session.user.id) {
        return NextResponse.json(
          { error: "Only the academic supervisor can review milestone documents." },
          { status: 403 },
        );
      }

      const newStatus = status === "APPROVED" ? "REVIEWED" : "DOCUMENT_SUBMITTED";
      const updated = await prisma.miniPresentation.update({
        where: { id: milestoneId },
        data: {
          status: newStatus,
          adminComment: reviewComment ?? null,
        },
      });

      // Tell the student(s) so they know it was reviewed.
      await Promise.all(
        milestone.internship.internshipstudent.map((s) =>
          NotificationService.trigger({
            userId: s.studentId,
            type: status === "APPROVED" ? "DOCUMENT_APPROVED" : "DOCUMENT_REJECTED",
            title: status === "APPROVED" ? "Milestone Document Approved" : "Milestone Document Needs Revision",
            message: `${session.user.name} ${status === "APPROVED" ? "approved" : "rejected"} your milestone "${milestone.title}".${reviewComment ? ` Comment: ${reviewComment}` : ""}`,
            relatedId: milestoneId,
            relatedType: "MiniPresentation",
            link: "/student/documents",
          }).catch(() => null),
        ),
      );

      await AuditService.log({
        userId: session.user.id,
        action: status === "APPROVED" ? "MILESTONE_APPROVED" : "MILESTONE_REJECTED",
        targetType: "MiniPresentation",
        targetId: milestoneId,
        details: { comment: reviewComment },
      }).catch(() => null);

      return NextResponse.json({ data: updated });
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

    // The teacher (academic supervisor) and the company validate INDEPENDENTLY.
    // A single shared `status` would make one party's decision silently apply
    // to the other, so we track each side separately and only resolve the
    // overall status from the combination.
    //
    // Final-report validation rule — dynamic gates based on actual participants:
    //   • needsTeacher  = internship.teacherId is set (PFE always has one;
    //                     NORMAL may or may not).
    //   • needsCompany  = topic was company-proposed (student-proposed topics
    //                     have no real company stakeholder, so that gate is
    //                     auto-passed).
    // The internship moves to PENDING_ADMIN_CONFIRMATION as soon as every
    // *required* gate is satisfied.
    const intRow = await prisma.internship.findUnique({
      where: { id: document.internshipId },
      select: {
        internshipType: true,
        teacherId: true,
        topic: { select: { type: true } },
      } as any,
    });
    const needsTeacher = !!(intRow as any)?.teacherId;
    const needsCompany = (intRow as any)?.topic?.type === "COMPANY_PROPOSED";
    const requiresBoth = document.type === "FINAL_REPORT" && needsTeacher && needsCompany;
    const approving = status === "APPROVED";

    const data: Record<string, unknown> = {};

    if (isTeacher) {
      data.approvedByTeacher = approving;
      data.reviewComment = reviewComment;
      data.reviewedById = session.user.id;
    } else if (isCompany) {
      data.approvedByCompany = approving;
      data.reviewedByCompany = session.user.id;
      data.companyComment = reviewComment;
    } else {
      // Admin override — acts globally, as before.
      data.reviewComment = reviewComment;
      data.reviewedById = session.user.id;
    }

    if (status === "REJECTED" || status === "NEEDS_REVISION") {
      // A rejection / revision request from any reviewer is terminal.
      data.status = status;
    } else if (isAdmin && !isTeacher && !isCompany) {
      data.status = status;
    } else if (requiresBoth) {
      const teacherApproved = isTeacher ? approving : document.approvedByTeacher;
      const companyApproved = isCompany ? approving : document.approvedByCompany;
      // Stays UPLOADED until BOTH have approved, so the other party still
      // sees (and must take) their own decision.
      data.status = teacherApproved && companyApproved ? "APPROVED" : "UPLOADED";
    } else {
      // Supervisor-only document.
      data.status = approving ? "APPROVED" : "UPLOADED";
    }

    const updated = await prisma.document.update({
      where: { id },
      data,
    });

    // ── Final-report state machine ──────────────────────────────────────────
    // Reviewing the FINAL REPORT drives the internship lifecycle:
    //  • Teacher AND company must both validate. Once both have, the
    //    internship moves to PENDING_ADMIN_CONFIRMATION so the admin can
    //    perform the final validation.
    //  • If EITHER the teacher or the company rejects (does not validate),
    //    the report is rejected: the internship goes to NEEDS_REVISION, both
    //    validation gates reset, and the student must submit a new version.
    if (document.type === "FINAL_REPORT" && (isTeacher || isCompany)) {
      const internship = await prisma.internship.findUnique({
        where: { id: document.internshipId },
        select: {
          status: true,
          teacherValidatedFinalReport: true,
          companyValidatedFinalReport: true,
          internshipstudent: { select: { studentId: true } },
        } as any,
      });

      if (internship) {
        const rejected = status === "REJECTED" || status === "NEEDS_REVISION";

        if (rejected) {
          await prisma.internship.update({
            where: { id: document.internshipId },
            data: {
              status: "NEEDS_REVISION",
              teacherValidatedFinalReport: false,
              teacherValidatedAt: null,
              companyValidatedFinalReport: false,
              companyValidatedAt: null,
              updatedAt: new Date(),
            } as any,
          });

          for (const { studentId } of (internship as any).internshipstudent) {
            await NotificationService.trigger({
              userId: studentId,
              type: "REVISION_REQUESTED",
              title: "Final Report Rejected — Revision Required",
              message: `${session.user.name} rejected the final report. Please submit a revised version.${reviewComment ? ` Comment: ${reviewComment}` : ""}`,
              relatedId: document.internshipId,
              relatedType: "Internship",
              link: "/student/documents",
            });
          }
        } else {
          const teacherValidated = isTeacher
            ? true
            : !!(internship as any).teacherValidatedFinalReport;
          const companyValidated = isCompany
            ? true
            : !!(internship as any).companyValidatedFinalReport;
          // Auto-pass the gates that don't have a real participant.
          const teacherOk = needsTeacher ? teacherValidated : true;
          const companyOk = needsCompany ? companyValidated : true;
          const allValidated = teacherOk && companyOk;

          await prisma.internship.update({
            where: { id: document.internshipId },
            data: {
              ...(isTeacher
                ? { teacherValidatedFinalReport: true, teacherValidatedAt: new Date() }
                : { companyValidatedFinalReport: true, companyValidatedAt: new Date() }),
              // Hand off to the admin once every required gate has cleared.
              ...(allValidated ? { status: "PENDING_ADMIN_CONFIRMATION" } : {}),
              updatedAt: new Date(),
            } as any,
          });

          if (allValidated) {
            const admins = await prisma.user.findMany({
              where: { role: "ADMIN", isActive: true },
              select: { id: true },
            });
            const validators = [
              needsTeacher ? "supervisor" : null,
              needsCompany ? "company" : null,
            ].filter(Boolean) as string[];
            const adminMessage =
              validators.length === 0
                ? "A final report is ready for your final confirmation."
                : validators.length === 1
                  ? `The ${validators[0]} has validated a final report. It now requires your final confirmation.`
                  : `The ${validators.join(" and the ")} have both validated a final report. It now requires your final confirmation.`;
            for (const admin of admins) {
              await NotificationService.trigger({
                userId: admin.id,
                type: "FINAL_REPORT_SUBMITTED",
                title: "Final Report Awaiting Admin Validation",
                message: adminMessage,
                relatedId: document.internshipId,
                relatedType: "Internship",
                link: `/admin/internships/${document.internshipId}`,
                skipEmail: true,
              });
            }
            const studentMessage =
              validators.length === 0
                ? "Your final report is now awaiting the administration's final confirmation."
                : validators.length === 1
                  ? `The ${validators[0]} validated your final report. It is now awaiting the administration's final confirmation.`
                  : `Both your ${validators.join(" and the ")} validated your final report. It is now awaiting the administration's final confirmation.`;
            for (const { studentId } of (internship as any).internshipstudent) {
              await NotificationService.trigger({
                userId: studentId,
                type: "FINAL_REPORT_SUBMITTED",
                title: "Final Report Fully Validated",
                message: studentMessage,
                relatedId: document.internshipId,
                relatedType: "Internship",
                link: "/student/internship",
                skipEmail: true,
              });
            }
          }
        }
      }
    }

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
