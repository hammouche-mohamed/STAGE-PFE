import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { accept, comment } = await req.json();

    const invitation = await prisma.teamInvitation.findUnique({
      where: { id },
      include: { studentteam: { include: { teammember: true } } }
    });

    if (!invitation || invitation.invitedStudentId !== session.user.id) {
      return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 400 });
    }

    if (accept) {
      // Check system settings for max team size
      const maxTeamSizeSetting = await prisma.systemSettings.findUnique({ where: { key: "MAX_TEAM_SIZE" } });
      const maxTeamSize = maxTeamSizeSetting ? parseInt(maxTeamSizeSetting.value) : 2;

      if (invitation.studentteam.teammember.length >= maxTeamSize) {
        return NextResponse.json({ error: "Team is already full" }, { status: 400 });
      }

      // Check if student is already in a team (they might have accepted another invite)
      const existingTeam = await prisma.teamMember.findFirst({
        where: { studentId: session.user.id }
      });

      if (existingTeam) {
        return NextResponse.json({ error: "You are already in a team." }, { status: 400 });
      }

      await prisma.$transaction([
        prisma.teamInvitation.update({
          where: { id },
          data: { status: "ACCEPTED", responseComment: comment, respondedAt: new Date() }
        }),
        prisma.teamMember.create({
          data: {
            teamId: invitation.teamId,
            studentId: session.user.id
          }
        }),
        // Reject all other pending invitations for this student
        prisma.teamInvitation.updateMany({
          where: {
            invitedStudentId: session.user.id,
            status: "PENDING",
            id: { not: id }
          },
          data: { status: "REJECTED", responseComment: "Auto-rejected because the student joined another team." }
        })
      ]);

      // Notify the leader
      await NotificationService.trigger({
        userId: invitation.studentteam.leaderId,
        type: "BINOME_ACCEPTED",
        title: "Team Invitation Accepted",
        message: `${session.user.name} has joined your team.`,
        relatedId: invitation.teamId,
        relatedType: "Team",
        link: "/student/team",
      });

      return NextResponse.json({ message: "Welcome to the team!" });
    } else {
      // Rejected
      await prisma.teamInvitation.update({
        where: { id },
        data: { status: "REJECTED", responseComment: comment, respondedAt: new Date() }
      });

      // Notify the leader
      await NotificationService.trigger({
        userId: invitation.studentteam.leaderId,
        type: "BINOME_DECLINED",
        title: "Team Invitation Declined",
        message: `${session.user.name} has declined to join your team. ${comment ? `Reason: ${comment}` : ''}`,
        relatedId: invitation.teamId,
        relatedType: "Team",
        link: "/student/team",
      });

      // Notify the Admin if requested by user feedback
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN", adminprofile: { filiereId: invitation.studentteam.filiereId } }
      } as any);

      for (const admin of adminUsers) {
        await NotificationService.trigger({
          userId: admin.id,
          type: "BINOME_DECLINED",
          title: "Team Invitation Rejected",
          message: `Student ${session.user.name} rejected a team invitation from Team ${invitation.studentteam.id}. Reason: ${comment || 'No reason'}`,
          relatedId: invitation.teamId,
          relatedType: "Team",
          link: "/admin/users?tab=teams",
        });
      }

      return NextResponse.json({ message: "Invitation declined" });
    }
  } catch (error) {
    console.error("[team invitations PATCH]", error);
    return NextResponse.json({ error: "Failed to respond to invitation" }, { status: 500 });
  }
}
