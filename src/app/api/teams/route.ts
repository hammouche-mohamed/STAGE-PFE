import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reason, invitedStudentIds } = await req.json();

    // ── GUARD: Check if student is already in a valid team ─────────────────
    const existingMember = await prisma.teamMember.findFirst({
      where: { studentId: session.user.id },
      include: { team: true }
    });

    if (existingMember) {
      if (!existingMember.team) {
        // Orphaned member record — team was deleted but member wasn't cleaned up
        await prisma.teamMember.delete({ where: { id: existingMember.id } });
      } else {
        return NextResponse.json(
          { error: "You are already part of a team. You cannot create a new one." },
          { status: 400 }
        );
      }
    }

    // Check system settings for max team size
    const maxTeamSizeSetting = await prisma.systemSettings.findUnique({ where: { key: "MAX_TEAM_SIZE" } });
    const maxTeamSize = maxTeamSizeSetting ? parseInt(maxTeamSizeSetting.value) : 2;

    if (invitedStudentIds && invitedStudentIds.length >= maxTeamSize) {
      return NextResponse.json(
        { error: `A team can have a maximum of ${maxTeamSize} members (including you).` },
        { status: 400 }
      );
    }

    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Use transaction to ensure everything is created together
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the team
      const team = await tx.studentTeam.create({
        data: {
          leaderId: session.user.id,
          filiereId: studentProfile.filiereId,
          academicYear: studentProfile.academicYear,
          reason: reason || null,
        }
      });

      // 2. Add the leader as a team member
      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: session.user.id,
          isLeader: true
        }
      });

      // 3. Create invitations for the invited students
      if (invitedStudentIds && invitedStudentIds.length > 0) {
        for (const studentId of invitedStudentIds) {
          await tx.teamInvitation.create({
            data: {
              teamId: team.id,
              invitedStudentId: studentId,
              expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            }
          });
        }
      }

      return team;
    });

    return NextResponse.json({ data: result, message: "Team created successfully" }, { status: 201 });
  } catch (error) {
    console.error("[teams POST]", error);
    return NextResponse.json({ error: "Failed to create team" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (session.user.role === "STUDENT") {
      const member = await prisma.teamMember.findFirst({
        where: { studentId: session.user.id },
        include: {
          team: {
            include: {
              members: {
                include: { student: { select: { id: true, name: true, email: true } } }
              },
              invitations: {
                where: { status: "PENDING" },
                include: { invitedStudent: { select: { id: true, name: true, email: true } } }
              }
            }
          }
        }
      });

      if (!member) {
        return NextResponse.json({ data: null });
      }

      // Clean up orphaned member record (team was deleted but member wasn't)
      if (!member.team) {
        await prisma.teamMember.delete({ where: { id: member.id } });
        return NextResponse.json({ data: null });
      }

      return NextResponse.json({ data: member.team });
    }

    if (session.user.role === "ADMIN") {
      const whereClause: any = {};
      if (!session.user.isSuperAdmin && session.user.filiereId) {
        whereClause.filiereId = session.user.filiereId;
      }
      
      const teams = await prisma.studentTeam.findMany({
        where: whereClause,
        include: {
          members: {
            include: { student: { select: { id: true, name: true, email: true } } }
          },
          filiere: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json({ data: teams });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("[teams GET]", error);
    return NextResponse.json({ error: "Failed to load team(s)" }, { status: 500 });
  }
}

