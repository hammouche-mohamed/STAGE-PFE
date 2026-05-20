import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";

/**
 * Admin invites a supervisor to a topic. The admin can invite ANY number of
 * teachers concurrently — each invitation is a `TeacherApplication` row with
 * status PENDING. The first teacher to accept wins; the others get notified
 * and their PENDING rows are auto-closed (see teacher-action ACCEPT).
 *
 * Body: { teacherId: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const teacherId = typeof body?.teacherId === "string" ? body.teacherId.trim() : "";
    if (!teacherId) {
      return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
    }

    const topic = await prisma.topic.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        status: true,
        filiereId: true,
        assignedTeacherId: true,
        archivedAt: true,
      },
    });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }
    if (topic.archivedAt) {
      return NextResponse.json({ error: "Topic is deleted" }, { status: 400 });
    }
    if (topic.assignedTeacherId) {
      return NextResponse.json(
        { error: "This topic already has a confirmed supervisor." },
        { status: 400 },
      );
    }
    if (topic.status === "TAKEN") {
      return NextResponse.json(
        { error: "This topic is already taken." },
        { status: 400 },
      );
    }

    // Department scoping for non-super admins.
    if (!session.user.isSuperAdmin && session.user.filiereId && topic.filiereId
        && topic.filiereId !== session.user.filiereId) {
      return NextResponse.json(
        { error: "Forbidden: topic belongs to another department" },
        { status: 403 },
      );
    }

    const teacher = await prisma.user.findUnique({
      where: { id: teacherId },
      select: { id: true, name: true, role: true, teacherprofile: { select: { maxStudents: true, currentLoad: true } } },
    });
    if (!teacher || teacher.role !== "TEACHER") {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }
    if (
      teacher.teacherprofile &&
      teacher.teacherprofile.currentLoad >= teacher.teacherprofile.maxStudents
    ) {
      return NextResponse.json(
        { error: `${teacher.name} has reached their maximum supervision load.` },
        { status: 409 },
      );
    }

    // (teacherId, topicId) is unique. Recycle a stale REJECTED row back to
    // PENDING so an admin can re-invite a teacher who was previously closed
    // out — and short-circuit if a PENDING / ACCEPTED row already exists.
    const existing = await prisma.teacherApplication.findUnique({
      where: { teacherId_topicId: { teacherId, topicId: id } },
    });

    let application;
    if (existing) {
      if (existing.status === "PENDING" || existing.status === "ACCEPTED") {
        return NextResponse.json(
          { error: `${teacher.name} is already invited to this topic.` },
          { status: 409 },
        );
      }
      application = await prisma.teacherApplication.update({
        where: { id: existing.id },
        data: { status: "PENDING", appliedAt: new Date() },
      });
    } else {
      application = await prisma.teacherApplication.create({
        data: {
          id: randomUUID(),
          teacherId,
          topicId: id,
          status: "PENDING",
        },
      });
    }

    await NotificationService.trigger({
      userId: teacherId,
      type: "TEACHER_ASSIGNED",
      title: "Supervision Invitation",
      message: `You have been invited to supervise: "${topic.title}". Please review and accept or decline.`,
      relatedId: topic.id,
      relatedType: "Topic",
      link: "/teacher/topics",
    });

    await AuditService.log({
      userId: session.user.id,
      action: "TEACHER_SUPERVISION_INVITED",
      targetType: "Topic",
      targetId: topic.title,
      details: { teacherId },
    });

    return NextResponse.json({ data: application, message: "Invitation sent." });
  } catch (error) {
    console.error("[invite-supervisor POST]", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}

/**
 * Admin withdraws a previously-sent invitation. The teacher's PENDING
 * application is removed and they receive an in-app + email notification
 * that the invitation was withdrawn.
 *
 * Query: ?teacherId=<id>
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" || session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const teacherId = searchParams.get("teacherId")?.trim();
    if (!teacherId) {
      return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
    }

    const topic = await prisma.topic.findUnique({
      where: { id },
      select: { id: true, title: true, filiereId: true, assignedTeacherId: true },
    });
    if (!topic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    if (!session.user.isSuperAdmin && session.user.filiereId && topic.filiereId
        && topic.filiereId !== session.user.filiereId) {
      return NextResponse.json(
        { error: "Forbidden: topic belongs to another department" },
        { status: 403 },
      );
    }

    // Two distinct cases sharing the same admin action:
    //  (a) Withdraw a PENDING invitation (teacher hasn't responded yet).
    //  (b) Remove the CONFIRMED supervisor (their application is ACCEPTED
    //      and topic.assignedTeacherId points at them). The topic returns
    //      to the marketplace and another supervisor can be invited.
    const isConfirmedSupervisor = topic.assignedTeacherId === teacherId;
    const application = await prisma.teacherApplication.findUnique({
      where: { teacherId_topicId: { teacherId, topicId: id } },
    });

    if (!application && !isConfirmedSupervisor) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    // Block removal once an internship has started — that lifecycle owns
    // the teacher relationship and can't be unwound by a single click.
    if (isConfirmedSupervisor) {
      const internship = await prisma.internship.findFirst({
        where: { topicId: id },
        select: { id: true, status: true },
      });
      if (internship && internship.status !== "CANCELLED") {
        return NextResponse.json(
          {
            error:
              "Cannot remove the supervisor — an internship has already been created for this topic.",
          },
          { status: 400 },
        );
      }
    } else if (application && application.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending invitations can be withdrawn." },
        { status: 400 },
      );
    }

    if (isConfirmedSupervisor) {
      await prisma.topic.update({
        where: { id },
        data: {
          assignedTeacherId: null,
          status: "OPEN_FOR_SELECTION",
        },
      });
    }
    if (application) {
      await prisma.teacherApplication.delete({ where: { id: application.id } });
    }

    await NotificationService.trigger({
      userId: teacherId,
      type: "TEACHER_REJECTED",
      title: isConfirmedSupervisor
        ? "Supervision Removed"
        : "Supervision Invitation Withdrawn",
      message: isConfirmedSupervisor
        ? `The administration has removed you as the supervisor of "${topic.title}".`
        : `The administration has withdrawn the invitation to supervise "${topic.title}".`,
      relatedId: topic.id,
      relatedType: "Topic",
      link: "/teacher/topics",
    });

    await AuditService.log({
      userId: session.user.id,
      action: isConfirmedSupervisor
        ? "SUPERVISOR_REMOVED_BY_ADMIN"
        : "TEACHER_SUPERVISION_WITHDRAWN_BY_ADMIN",
      targetType: "Topic",
      targetId: topic.title,
      details: { teacherId },
    });

    return NextResponse.json({
      message: isConfirmedSupervisor
        ? "Supervisor removed. The topic is back in the marketplace."
        : "Invitation withdrawn.",
    });
  } catch (error) {
    console.error("[invite-supervisor DELETE]", error);
    return NextResponse.json({ error: "Failed to withdraw invitation" }, { status: 500 });
  }
}
