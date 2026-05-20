import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id: rawId } = await params;
    const id = rawId.trim();


    const topic = await prisma.topic.findFirst({
      where: {
        id: {
          equals: id,
        }
      },
      include: {
        proposedBy: {
          include: {
            companyprofile: true
          }
        },
        assignedTeacher: { select: { id: true, name: true } },
        filiere: true,
        teacherapplication: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          },
          orderBy: { appliedAt: 'desc' }
        },
        studentapplication: {
          include: {
            studentteam: {
              include: {
                teammember: {
                  include: {
                    user: { select: { id: true, name: true, email: true } }
                  }
                }
              }
            }
          },
          orderBy: { appliedAt: 'desc' }
        }
      }
    } as any);

    if (!topic) {
      console.warn(`[TOPIC_DETAIL] Not found: "${id}"`);
      return NextResponse.json({
        error: `TOPIC_NOT_FOUND: The requested ID "${id}" does not exist in the database.`
      }, { status: 404 });
    }

    const enrichedTopic = {
      ...topic,
      teacherApplications: (topic as any).teacherapplication || [],
      studentApplications: (topic as any).studentapplication || [],
      companyName: topic.companyName || (topic as any).proposedBy?.companyprofile?.companyName,
      companySector: topic.companySector || (topic as any).proposedBy?.companyprofile?.sector,
      contactPerson: topic.contactPerson || (topic as any).proposedBy?.name,
      contactEmail: topic.contactEmail || (topic as any).proposedBy?.email,
      contactPhone: topic.contactPhone || (topic as any).proposedBy?.companyprofile?.contactPhone
    };

    return NextResponse.json({ data: enrichedTopic });
  } catch (error: any) {
    console.error("[TOPIC_DETAIL] CRASH:", error);
    return NextResponse.json({
      error: `SERVER_CRASH: ${error.message || "Unknown database error"}`
    }, { status: 500 });
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
        where: {
          role: 'ADMIN',
          ...(topic.filiereId ? {
            OR: [
              { adminprofile: { isSuperAdmin: true } },
              { adminprofile: { filiereId: topic.filiereId } }
            ]
          } : {} as any)
        },
        select: { id: true },
      } as any);

      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map(admin => ({
            id: randomUUID(),
            userId: admin.id,
            type: 'TOPIC_SUBMITTED',
            title: 'Topic Edit Request',
            message: `${session.user.name} has requested an edit for the topic: "${topic.title}". Please review it.`,
            relatedId: id,
            relatedType: 'Topic',
            link: '/admin/topics',
          }))
        });
      }

      return NextResponse.json({ message: "Edit request submitted. Awaiting admin approval." });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!session.user.isSuperAdmin && session.user.filiereId && topic.filiereId && topic.filiereId !== session.user.filiereId) {
      return NextResponse.json({ error: "Forbidden: Topic belongs to another department" }, { status: 403 });
    }

    const {
      teacherId, status, rejectionReason,
      title, description, type, maxStudents, requiredSkills, internshipType,
      filiereId, targetLevels,
      approvePendingEdit, rejectPendingEdit,
    } = body;

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

    if (teacherId && teacherId !== topic.assignedTeacherId) {
      const teacherProfile = await prisma.teacherProfile.findUnique({ where: { userId: teacherId } });
      if (teacherProfile && teacherProfile.currentLoad >= teacherProfile.maxStudents) {
        return NextResponse.json(
          { error: `Teacher has reached maximum supervision load (${teacherProfile.maxStudents}).` },
          { status: 400 }
        );
      }
    }

    // A teacher only becomes the supervisor once THEY accept the assignment,
    // EXCEPT when the teacher already self-applied through the marketplace —
    // their application IS their acceptance, so the admin picking them is a
    // direct confirmation. Skip the PENDING_TEACHER detour in that case.
    const assigningNewTeacher = !!teacherId && teacherId !== topic.assignedTeacherId;
    let teacherSelfApplied = false;
    if (assigningNewTeacher) {
      const existingApp = await prisma.teacherApplication.findFirst({
        where: {
          topicId: id,
          teacherId,
          status: { in: ["PENDING", "ACCEPTED"] },
        },
        select: { id: true },
      });
      teacherSelfApplied = !!existingApp;
    }
    const effectiveStatus =
      assigningNewTeacher && !teacherSelfApplied
        ? "PENDING_TEACHER"
        : status;

    // Hard rule: an admin cannot manually publish a topic while its assigned
    // supervisor still has a pending acceptance. They must either wait for the
    // teacher to confirm, reassign a different teacher, or explicitly clear the
    // supervisor (teacherId: "") to send it to the marketplace.
    const clearingTeacher = teacherId !== undefined && !teacherId;
    if (
      topic.status === "PENDING_TEACHER" &&
      topic.assignedTeacherId &&
      effectiveStatus === "OPEN_FOR_SELECTION" &&
      !assigningNewTeacher &&
      !clearingTeacher
    ) {
      return NextResponse.json(
        {
          error:
            "The assigned supervisor must accept the assignment before this topic can open for student selection.",
        },
        { status: 400 },
      );
    }

    // The department admin must set target study level(s) before a topic is
    // opened for selection. Company proposals never carry levels; student
    // proposals inherit the proposer's level, so they're exempt.
    if (effectiveStatus === "OPEN_FOR_SELECTION" && !topic.proposedByStudent) {
      const effectiveLevels =
        targetLevels !== undefined ? targetLevels : topic.targetLevels;
      if (!effectiveLevels || !String(effectiveLevels).trim()) {
        return NextResponse.json(
          { error: "Select at least one target study level (L1–M2) before publishing this topic." },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.topic.update({
      where: { id },
      data: {
        ...(teacherId !== undefined && { assignedTeacherId: teacherId || null }),
        ...(effectiveStatus && { status: effectiveStatus }),
        ...(title && { title }),
        ...(description && { description }),
        ...(type && { type }),
        ...(maxStudents && { maxStudents: parseInt(maxStudents.toString()) }),
        ...(requiredSkills !== undefined && { requiredSkills }),
        ...(internshipType !== undefined && { internshipType }),
        ...(filiereId !== undefined && { filiereId: filiereId || null }),
        ...(targetLevels !== undefined && !topic.proposedByStudent && { targetLevels: targetLevels || null }),
        ...(rejectionReason && {
          rejectionReason,
          ...(effectiveStatus === "REJECTED" && { supervisorRejectionCount: { increment: 1 } }),
        }),
        updatedAt: new Date(),
      },
    });

    if (effectiveStatus && ["OPEN_FOR_SELECTION", "REJECTED", "PENDING_TEACHER"].includes(effectiveStatus)) {
      const notifType = effectiveStatus === "REJECTED" ? "TOPIC_REJECTED" : "TOPIC_APPROVED";
      const notifTitle =
        effectiveStatus === "OPEN_FOR_SELECTION" ? "Topic Approved — Now Open for Selection"
          : effectiveStatus === "REJECTED" ? "Topic Rejected"
            : "Supervisor Assigned — Awaiting Confirmation";
      const notifMessage =
        effectiveStatus === "OPEN_FOR_SELECTION"
          ? `Your topic "${topic.title}" has been approved and is now open for student selection.`
          : effectiveStatus === "REJECTED"
            ? `Your topic "${topic.title}" was rejected. ${rejectionReason ? `Reason: ${rejectionReason}` : ""}`
            : `A supervisor has been assigned to "${topic.title}" and must accept the assignment before it opens for student selection.`;

      await NotificationService.trigger({
        userId: topic.proposedById,
        type: notifType,
        title: notifTitle,
        message: notifMessage,
        relatedId: topic.id,
        relatedType: "Topic",
      });
    }

    if (teacherId && teacherId !== topic.assignedTeacherId) {
      // Two distinct cases:
      //  - Teacher self-applied via marketplace → admin picking them IS the
      //    confirmation; no extra accept step. Notify as "You're the
      //    supervisor".
      //  - Admin picked a teacher who did NOT apply → ask them to accept or
      //    decline.
      await NotificationService.trigger({
        userId: teacherId,
        type: teacherSelfApplied ? "TEACHER_ACCEPTED" : "TEACHER_ASSIGNED",
        title: teacherSelfApplied
          ? "Supervision Confirmed"
          : "New Supervision Request",
        message: teacherSelfApplied
          ? `Your supervision request for "${topic.title}" was accepted. You are now the supervisor — the topic is open for student selection.`
          : `You have been assigned to supervise: "${topic.title}". Please review and accept or decline.`,
        relatedId: topic.id,
        relatedType: "Topic",
        link: teacherSelfApplied
          ? `/teacher/internships`
          : `/teacher/topics`,
      });
    }

    if (teacherId && teacherId !== topic.assignedTeacherId) {
      try {
        await prisma.teacherApplication.updateMany({
          where: { topicId: id, teacherId, status: "PENDING" },
          data: { status: "ACCEPTED" },
        });
        const rejected = await prisma.teacherApplication.findMany({
          where: { topicId: id, status: "PENDING", NOT: { teacherId } },
          select: { teacherId: true },
        });
        if (rejected.length > 0) {
          await prisma.teacherApplication.updateMany({
            where: { topicId: id, status: "PENDING", NOT: { teacherId } },
            data: { status: "REJECTED" },
          });
          await Promise.all(
            rejected.map((r) =>
              NotificationService.trigger({
                userId: r.teacherId,
                type: "TEACHER_REJECTED",
                title: "Supervision Request Closed",
                message: `Another supervisor was chosen for "${topic.title}". Your supervision request was not selected.`,
                relatedId: topic.id,
                relatedType: "Topic",
              }).catch(() => null),
            ),
          );
        }
      } catch (e) {
        console.error("Failed to resolve supervision applications:", e);
      }
    }

    if (!session.user.isSuperAdmin) {
      const superAdmins = await prisma.user.findMany({
        where: { adminprofile: { isSuperAdmin: true } } as any,
        select: { id: true }
      });

      if (superAdmins.length > 0) {
        await prisma.notification.createMany({
          data: superAdmins.map(sa => ({
            id: randomUUID(),
            userId: sa.id,
            type: "ACCOUNT_MODIFIED",
            title: "Department Admin Action",
            message: `Admin ${session.user.name} has updated topic: "${topic.title}" (Status: ${status || topic.status}).`,
            relatedId: topic.id,
            relatedType: "Topic",
            link: `/admin/topics/${topic.id}`
          }))
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

    const body = await req.json().catch(() => ({} as any));
    const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

    const topic = await prisma.topic.findUnique({
      where: { id },
      include: { internship: { select: { status: true, activatedAt: true } } },
    });

    if (!topic) return NextResponse.json({ error: "Topic not found" }, { status: 404 });

    if ((topic as any).archivedAt) {
      return NextResponse.json({ error: "Topic is already deleted." }, { status: 400 });
    }

    // A deletion reason is mandatory for everyone.
    if (!reason) {
      return NextResponse.json({ error: "A reason is required to delete this topic." }, { status: 400 });
    }
    if (reason.length > 1000) {
      return NextResponse.json({ error: "The deletion reason is too long (max 1000 characters)." }, { status: 400 });
    }

    // If an internship has already started for this topic, the topic is locked:
    // students are actively working on it and it must remain on record.
    const internship = (topic as any).internship as { status: string; activatedAt: Date | null } | null;
    const internshipStarted =
      !!internship &&
      (!!internship.activatedAt ||
        !["REQUESTED", "CANCELLED"].includes(internship.status));
    if (internshipStarted || topic.status === "TAKEN") {
      return NextResponse.json({
        error: "This topic cannot be deleted because students have already started the internship linked to it.",
      }, { status: 400 });
    }

    if (session.user.role === "ADMIN") {
      if (session.user.isSuperAdmin) {
        return NextResponse.json({
          error: "Forbidden: Super Administrators have read-only access to topic moderation."
        }, { status: 403 });
      }

      if (!session.user.isSuperAdmin && session.user.filiereId && topic.filiereId && topic.filiereId !== session.user.filiereId) {
        return NextResponse.json({ error: "Forbidden: Topic belongs to another department" }, { status: 403 });
      }
    } else if (session.user.role === "STUDENT") {

      if (topic.directAssigneeId !== session.user.id || !topic.proposedByStudent) {
        return NextResponse.json({ error: "You can only remove your own proposed topics" }, { status: 403 });
      }
      if (topic.status !== "PENDING_ADMIN") {
        return NextResponse.json({
          error: "Cannot remove a topic that has already been validated. Contact the admin.",
        }, { status: 400 });
      }
    } else if (session.user.role === "COMPANY") {
      if (topic.proposedById !== session.user.id) {
        return NextResponse.json({ error: "You can only remove your own proposed topics" }, { status: 403 });
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.topic.update({
      where: { id },
      data: {
        archivedAt: new Date(),
        deletionReason: reason,
        deletedById: session.user.id,
      } as any,
    });

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_DELETED",
      targetType: "Topic",
      targetId: topic.title,
      details: { title: topic.title, status: topic.status, reason },
    });

    // Notify the responsible administrators (department admins for this topic's
    // filière + super admins) with both an in-app notification and an email.
    try {
      const admins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          ...(topic.filiereId
            ? {
                OR: [
                  { adminprofile: { isSuperAdmin: true } },
                  { adminprofile: { filiereId: topic.filiereId } },
                ],
              }
            : {}),
        } as any,
        select: { id: true },
      });

      await Promise.all(
        admins.map((admin) =>
          NotificationService.trigger({
            userId: admin.id,
            type: "TOPIC_DELETED",
            title: "Topic Deleted",
            message: `${session.user.name} deleted the topic "${topic.title}". Reason: ${reason}`,
            relatedId: topic.id,
            relatedType: "Topic",
            link: "/admin/topics",
          }).catch(() => null),
        ),
      );
    } catch (notifyError) {
      console.error("[topics/[id] DELETE] admin notification failed:", notifyError);
    }

    return NextResponse.json({ message: "Topic deleted successfully." });
  } catch (error) {
    console.error("Topic delete error:", error);
    return NextResponse.json({ error: "Failed to delete topic." }, { status: 500 });
  }
}
