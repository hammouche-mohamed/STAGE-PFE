import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification.service";
import { AuditService } from "@/lib/services/audit.service";
import { getTeamCommitment } from "@/lib/services/teamCommitment.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, teamId, message } = await req.json();

    const team = await prisma.studentTeam.findUnique({
      where: { id: teamId },
      include: { teammember: true, teaminvitation: { where: { status: "PENDING" } } }
    });

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    if (team.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Only the team leader can send invitations" }, { status: 403 });
    }

    const commitment = await getTeamCommitment(teamId);
    if (commitment.locked) {
      const why =
        commitment.reason === 'active_internship'
          ? 'the team is enrolled in an active internship'
          : 'the team has been accepted on a topic';
      return NextResponse.json(
        { error: `You cannot invite new members because ${why}. The team roster is locked.` },
        { status: 400 },
      );
    }

    const isAlreadyInTeam = await prisma.teamMember.findFirst({
      where: { studentId }
    });

    if (isAlreadyInTeam) {
      return NextResponse.json({ error: "This student is already in a team." }, { status: 400 });
    }

    const existingInvite = await prisma.teamInvitation.findFirst({
      where: { teamId, invitedStudentId: studentId, status: "PENDING" }
    });

    if (existingInvite) {
      return NextResponse.json({ error: "You already invited this student." }, { status: 400 });
    }

    const invitation = await prisma.teamInvitation.create({
      data: {
        teamId,
        invitedStudentId: studentId,
        message,
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
      }
    });

    await NotificationService.trigger({
      userId: studentId,
      type: "BINOME_INVITATION",
      title: "Team Invitation",
      message: `${session.user.name} has invited you to join their team.`,
      relatedId: teamId,
      relatedType: "Team",
      link: "/student/invitations",
    });

    // Notify the department's admins (+ super admins). "SYSTEM_ALERT" is not
    // a valid notification_type enum, which silently broke this before.
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        OR: [
          { adminprofile: { isSuperAdmin: true } },
          { adminprofile: { filiereId: team.filiereId } },
        ],
      } as any,
      select: { id: true },
    });
    for (const admin of admins) {
      await NotificationService.trigger({
        userId: admin.id,
        type: "BINOME_INVITATION",
        title: "New Team Invitation",
        message: `Student ${session.user.name} sent a team invitation to another student.`,
        relatedId: teamId,
        relatedType: "Team",
        link: "/admin/users?tab=teams",
        skipEmail: true,
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "TEAM_INVITATION_SENT",
      targetType: "TeamInvitation",
      targetId: invitation.id,
      details: { teamId, invitedStudentId: studentId },
    });

    return NextResponse.json({ data: invitation, message: "Invitation sent successfully" });
  } catch (error) {
    console.error("[team invitations POST]", error);
    return NextResponse.json({ error: "Failed to send invitation" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const invitations = await prisma.teamInvitation.findMany({
      where: { invitedStudentId: session.user.id },
      include: {
        studentteam: {
          include: {
            teammember: {
              where: { isLeader: true },
              include: { user: { select: { name: true, email: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // The client expects `team.members[].student.{name,email}` — map the
    // Prisma relation names (studentteam / teammember / user) onto it so the
    // page doesn't crash on `inv.team.members`.
    const data = invitations.map((inv) => ({
      id: inv.id,
      status: inv.status,
      // Show the receiver whatever the sender wrote: the invitation's own
      // message, or — when invited via team creation — the message the
      // leader typed when creating the team (studentteam.reason).
      message: inv.message || (inv as any).studentteam?.reason || null,
      expiresAt: inv.expiresAt,
      createdAt: inv.createdAt,
      team: {
        members: (inv as any).studentteam?.teammember?.map((m: any) => ({
          student: { name: m.user?.name ?? "", email: m.user?.email ?? "" },
        })) ?? [],
      },
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[team invitations GET]", error);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

