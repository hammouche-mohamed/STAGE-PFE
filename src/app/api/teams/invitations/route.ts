import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, teamId, message } = await req.json();

    // Verify team
    const team = await prisma.studentTeam.findUnique({
      where: { id: teamId },
      include: { members: true, invitations: { where: { status: "PENDING" } } }
    });

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    // Verify caller is leader
    if (team.leaderId !== session.user.id) {
      return NextResponse.json({ error: "Only the team leader can send invitations" }, { status: 403 });
    }

    // Check system settings for max team size
    const maxTeamSizeSetting = await prisma.systemSettings.findUnique({ where: { key: "MAX_TEAM_SIZE" } });
    const maxTeamSize = maxTeamSizeSetting ? parseInt(maxTeamSizeSetting.value) : 2;

    const currentTotalSize = team.members.length + team.invitations.length;
    if (currentTotalSize >= maxTeamSize) {
      return NextResponse.json({ error: `You cannot invite more students. Max team size is ${maxTeamSize}.` }, { status: 400 });
    }

    // Check if student is already in a team
    const isAlreadyInTeam = await prisma.teamMember.findFirst({
      where: { studentId }
    });

    if (isAlreadyInTeam) {
      return NextResponse.json({ error: "This student is already in a team." }, { status: 400 });
    }

    // Check if already invited
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

    // Notify the student
    await NotificationService.trigger({
      userId: studentId,
      type: "BINOME_INVITATION",
      title: "Team Invitation",
      message: `${session.user.name} has invited you to join their team.`,
      relatedId: teamId,
      relatedType: "Team",
      link: "/student/invitations",
    });

    // Point 1: Notify all admins about the new invitation
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    for (const admin of admins) {
      await NotificationService.trigger({
        userId: admin.id,
        type: "SYSTEM_ALERT",
        title: "New Team Invitation",
        message: `Student ${session.user.name} sent a team invitation to another student.`,
        relatedId: teamId,
        relatedType: "Team",
        link: "/admin/internships",
      });
    }

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
        team: {
          include: {
            members: {
              where: { isLeader: true },
              include: { student: { select: { name: true, email: true } } }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error("[team invitations GET]", error);
    return NextResponse.json({ error: "Failed to load invitations" }, { status: 500 });
  }
}

