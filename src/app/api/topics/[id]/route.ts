import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const topic = await prisma.topic.findUnique({
      where: { id },
      include: {
        proposedBy: { select: { id: true, name: true, email: true } },
        assignedTeacher: { select: { id: true, name: true } },
        filiere: { select: { id: true, name: true, code: true } },
        ...(session.user.role === "ADMIN" && {
          teacherApplications: {
            include: {
              teacher: { select: { id: true, name: true, email: true } }
            },
            orderBy: { appliedAt: 'desc' }
          }
        })
      },
    });

    if (!topic) return NextResponse.json({ error: "Topic not found." }, { status: 404 });

    // Fetch Student Applications and include the Team and its members
    const applications = await prisma.studentApplication.findMany({
      where: { topicId: id },
      include: {
        team: {
          include: {
            members: {
              include: { student: { select: { id: true, name: true, email: true } } }
            }
          }
        }
      },
      orderBy: { appliedAt: 'desc' }
    });

    return NextResponse.json({ 
      data: {
        ...topic,
        studentApplications: applications
      }
    });
  } catch (error) {
    console.error("[topics/[id] GET]", error);
    return NextResponse.json({ error: "Failed to load topic." }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json();

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { proposedBy: true },
    });
    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    // ── COMPANY: request a pending edit ────────────────────────────────────
    if (session.user.role === "COMPANY") {
      if (topic.proposedById !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (["TAKEN", "REJECTED"].includes(topic.status)) {
        return NextResponse.json({ error: "Cannot request edits on this topic" }, { status: 400 });
      }

      const { title, description, requiredSkills, companyName, companySector, contactPerson, contactEmail, contactPhone } = body;
      const pendingEditData = JSON.stringify({
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(requiredSkills !== undefined && { requiredSkills }),
        ...(companyName !== undefined && { companyName }),
        ...(companySector !== undefined && { companySector }),
        ...(contactPerson !== undefined && { contactPerson }),
        ...(contactEmail !== undefined && { contactEmail }),
        ...(contactPhone !== undefined && { contactPhone }),
      });

      await prisma.topic.update({
        where: { id },
        data: { pendingEditData, pendingEditRequestedAt: new Date() },
      });

      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      });

      for (const admin of admins) {
        await NotificationService.trigger({
          userId: admin.id,
          type: 'TOPIC_SUBMITTED',
          title: 'Topic Edit Request',
          message: `${session.user.name} has requested an edit for the topic: "${topic.title}". Please review it.`,
          relatedId: id,
          relatedType: 'Topic',
          link: '/admin/topics',
        });
      }

      return NextResponse.json({ message: "Edit request submitted. Awaiting admin approval." });
    }

    // ── ADMIN: direct edit or approve/reject pending company edit ──────────
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Dept Admin Scoping Check
    if (!session.user.isSuperAdmin && session.user.filiereId && topic.filiereId && topic.filiereId !== session.user.filiereId) {
      return NextResponse.json({ error: "Forbidden: Topic belongs to another department" }, { status: 403 });
    }

    const {
      teacherId, status, rejectionReason,
      title, description, type, maxStudents, requiredSkills, internshipType,
      filiereId, targetLevels,
      approvePendingEdit, rejectPendingEdit,
    } = body;

    // Approve the company's pending edit
    if (approvePendingEdit && topic.pendingEditData) {
      const pendingChanges = JSON.parse(topic.pendingEditData);
      const updated = await prisma.topic.update({
        where: { id },
        data: { ...pendingChanges, pendingEditData: null, pendingEditRequestedAt: null, updatedAt: new Date() },
      });
      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TOPIC_APPROVED",
        title: "Edit Request Approved",
        message: `Your edit request for "${topic.title}" has been approved.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
      return NextResponse.json({ data: updated });
    }

    // Reject the company's pending edit
    if (rejectPendingEdit) {
      const updated = await prisma.topic.update({
        where: { id },
        data: { pendingEditData: null, pendingEditRequestedAt: null, updatedAt: new Date() },
      });
      await NotificationService.trigger({
        userId: topic.proposedById,
        type: "TOPIC_REJECTED",
        title: "Edit Request Rejected",
        message: `Your edit request for "${topic.title}" was rejected by the administrator.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
      return NextResponse.json({ data: updated });
    }

    // Check teacher load before assigning
    if (teacherId && teacherId !== topic.assignedTeacherId) {
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: teacherId } });
      if (teacherProfile && teacherProfile.currentLoad >= teacherProfile.maxStudents) {
        return NextResponse.json(
          { error: `Teacher has reached maximum supervision load (${teacherProfile.maxStudents}).` },
          { status: 400 }
        );
      }
    }

    // General admin update
    const updated = await prisma.topic.update({
      where: { id },
      data: {
        ...(teacherId !== undefined && { assignedTeacherId: teacherId }),
        ...(status && { status }),
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        ...(maxStudents && { maxStudents: parseInt(maxStudents.toString()) }),
        ...(requiredSkills !== undefined && { requiredSkills }),
        ...(internshipType !== undefined && { internshipType }),
        ...(filiereId !== undefined && { filiereId: filiereId || null }),
        ...(targetLevels !== undefined && { targetLevels: targetLevels || null }),
        ...(rejectionReason && {
          rejectionReason,
          ...(status === "REJECTED" && { supervisorRejectionCount: { increment: 1 } }),
        }),
        updatedAt: new Date(),
      },
    });

    // Notify proposer on status change
    if (status && ["OPEN_FOR_SELECTION", "REJECTED", "PENDING_TEACHER"].includes(status)) {
      const notifType = status === "REJECTED" ? "TOPIC_REJECTED" : "TOPIC_APPROVED";
      const notifTitle =
        status === "OPEN_FOR_SELECTION" ? "Topic Approved — Now Open for Selection"
        : status === "REJECTED" ? "Topic Rejected"
        : "Topic Updated";
      const notifMessage =
        status === "OPEN_FOR_SELECTION"
          ? `Your topic "${topic.title}" has been approved and is now open for student selection.`
          : status === "REJECTED"
          ? `Your topic "${topic.title}" was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`
          : `Your topic "${topic.title}" has been updated.`;

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    // Notify teacher if newly assigned
    if (teacherId && teacherId !== topic.assignedTeacherId) {
      await NotificationService.trigger({
        userId: teacherId,
        type: "TEACHER_ASSIGNED",
        title: "New Supervision Request",
        message: `You have been assigned to supervise: "${topic.title}". Please review and accept or decline.`,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    // Notify Super Admins if a Department Admin took action
    if (!session.user.isSuperAdmin) {
      const superAdmins = await prisma.user.findMany({
        where: { adminProfile: { isSuperAdmin: true } },
        select: { id: true }
      });

      for (const sa of superAdmins) {
        await NotificationService.trigger({
          userId: sa.id,
          type: "TOPIC_UPDATED_BY_ADMIN",
          title: "Department Admin Action",
          message: `Admin ${session.user.name} has updated topic: "${topic.title}" (Status: ${status || topic.status}).`,
          relatedId: topic.id,
          relatedType: "Topic",
          link: `/admin/topics/${topic.id}`
        });
      }
    }

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_UPDATED_BY_ADMIN",
      targetType: "Topic",
      targetId: updated.id,
      details: { status, teacherId, filiereId, targetLevels },
    });

    // Clear related notifications for all admins
    await NotificationService.clearRelated(id, 'Topic');

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error("[topics/[id] PATCH]", error);
    return NextResponse.json({ error: "Failed to update topic." }, { status: 500 });
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
    const topic = await prisma.topic.findUnique({ where: { id } });

    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    if (session.user.role === "ADMIN") {
      // Dept Admin Scoping Check
      if (!session.user.isSuperAdmin && session.user.filiereId && topic.filiereId && topic.filiereId !== session.user.filiereId) {
        return NextResponse.json({ error: "Forbidden: Topic belongs to another department" }, { status: 403 });
      }
      // Admin can always delete if scoped correctly
    } else if (session.user.role === "STUDENT") {
      // Student can only delete their own PENDING_ADMIN student-proposed topics
      if (topic.directAssigneeId !== session.user.id || !topic.proposedByStudent) {
        return NextResponse.json({ error: "You can only delete your own proposed topics" }, { status: 403 });
      }
      if (topic.status !== "PENDING_ADMIN") {
        return NextResponse.json({
          error: "Cannot delete a topic that has already been validated. Contact the admin.",
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.topic.delete({ where: { id } });

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_DELETED",
      targetType: "Topic",
      targetId: topic.title,
      details: { title: topic.title },
    });

    return NextResponse.json({ message: "Topic deleted successfully." });
  } catch (error) {
    console.error("Topic delete error:", error);
    return NextResponse.json({ error: "Failed to delete topic." }, { status: 500 });
  }
}
