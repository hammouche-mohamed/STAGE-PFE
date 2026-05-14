import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id: teamId } = await params;
    
    // Get comment from query
    const url = new URL(req.url);
    const comment = url.searchParams.get("comment") || "No reason provided.";

    const team = await prisma.studentTeam.findUnique({
      where: { id: teamId },
      include: { teammember: { include: { user: true } } }
    });

    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const member = team.teammember.find(m => m.studentId === session.user.id);
    if (!member) {
      return NextResponse.json({ error: "You are not in this team" }, { status: 403 });
    }

    // Check if team is in an active internship
    const activeInternship = await prisma.internshipStudent.findFirst({
      where: { studentId: session.user.id, internship: { status: { notIn: ["CANCELLED"] } } }
    });

    if (activeInternship) {
      return NextResponse.json({ error: "You cannot leave a team while enrolled in an active internship." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.teamMember.delete({ where: { id: member.id } });

      if (member.isLeader) {
        // Find next member to be leader
        const nextMember = team.teammember.find(m => m.id !== member.id);
        if (nextMember) {
          await tx.studentTeam.update({
            where: { id: teamId },
            data: { leaderId: nextMember.studentId }
          });
          await tx.teamMember.update({
            where: { id: nextMember.id },
            data: { isLeader: true }
          });
        } else {
          // If no members left, delete the team and all invitations
          await tx.teamInvitation.deleteMany({ where: { teamId } });
          await tx.studentApplication.deleteMany({ where: { teamId } });
          await tx.studentTeam.delete({ where: { id: teamId } });
        }
      }
    });

    // Send notifications if the team still exists
    if (team.teammember.length > 1) {
      const remainingMembers = team.teammember.filter(m => m.id !== member.id);
      
      for (const m of remainingMembers) {
        await NotificationService.trigger({
          userId: m.studentId,
          type: "BINOME_DECLINED", // reusing type
          title: "Team Member Left",
          message: `${session.user.name} has left the team. Reason: ${comment}`,
          relatedId: teamId,
          relatedType: "Team",
          link: "/student/team",
        });
      }

      // Notify Admin
      const adminUsers = await prisma.user.findMany({
        where: { role: "ADMIN", adminprofile: { filiereId: team.filiereId } }
      } as any);

      for (const admin of adminUsers) {
        await NotificationService.trigger({
          userId: admin.id,
          type: "BINOME_DECLINED",
          title: "Student Left Team",
          message: `Student ${session.user.name} left Team ${team.id}. Reason: ${comment}`,
          relatedId: teamId,
          relatedType: "Team",
          link: "/admin/users?tab=teams",
        });
      }
    }

    return NextResponse.json({ message: "You have left the team." });
  } catch (error) {
    console.error("[team members DELETE]", error);
    return NextResponse.json({ error: "Failed to leave team" }, { status: 500 });
  }
}
