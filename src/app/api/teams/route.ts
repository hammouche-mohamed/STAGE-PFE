import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { getTeamCommitment } from "@/lib/services/teamCommitment.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reason, invitedStudentIds } = await req.json();

    const existingMember = await prisma.teamMember.findFirst({
      where: { studentId: session.user.id },
      include: { studentteam: true } as any
    });

    if (existingMember) {
      if (!(existingMember as any).studentteam) {
        await prisma.teamMember.delete({ where: { id: existingMember.id } });
      } else {
        return NextResponse.json(
          { error: "You are already part of a team. You cannot create a new one." },
          { status: 400 }
        );
      }
    }


    const studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: session.user.id }
    });

    if (!studentProfile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const team = await tx.studentTeam.create({
        data: {
          leaderId: session.user.id,
          filiereId: studentProfile.filiereId,
          academicYear: studentProfile.academicYear,
          reason: reason || null,
        }
      });

      await tx.teamMember.create({
        data: {
          teamId: team.id,
          studentId: session.user.id,
          isLeader: true
        }
      });

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

    await AuditService.log({
      userId: session.user.id,
      action: "TEAM_CREATED",
      targetType: "StudentTeam",
      targetId: result.id,
      details: {
        invitedCount: invitedStudentIds?.length ?? 0,
        reason: reason || null,
      },
    });

    // Notify the department's admins (and super admins) that a team formed.
    const admins = await prisma.user.findMany({
      where: {
        role: "ADMIN",
        OR: [
          { adminprofile: { isSuperAdmin: true } },
          { adminprofile: { filiereId: studentProfile.filiereId } },
        ],
      } as any,
      select: { id: true },
    });
    for (const admin of admins) {
      await NotificationService.trigger({
        userId: admin.id,
        // NOTE: "SYSTEM_ALERT" is NOT a valid notification_type enum value —
        // using it made prisma.notification.create throw (silently swallowed
        // by NotificationService), so the admin never got notified. Use a
        // valid team/binôme enum value instead.
        type: "BINOME_ACCEPTED",
        title: "New Team Created",
        message: `${session.user.name} created a team${
          invitedStudentIds?.length ? ` and invited ${invitedStudentIds.length} student(s)` : ""
        }.`,
        relatedId: result.id,
        relatedType: "Team",
        link: "/admin/users?tab=teams",
        skipEmail: true,
      });
    }

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
          studentteam: {
            include: {
              teammember: {
                include: { user: { select: { id: true, name: true, email: true, level: true } } }
              },
              teaminvitation: {
                where: { status: "PENDING" },
                include: { user: { select: { id: true, name: true, email: true, level: true } } }
              }
            }
          }
        }
      } as any);

      if (!member) {
        return NextResponse.json({ data: null });
      }

      const m = member as any;

      if (!m.studentteam) {
        await prisma.teamMember.delete({ where: { id: member.id } });
        return NextResponse.json({ data: null });
      }

      const commitment = await getTeamCommitment(m.studentteam.id);

      const team = {
        ...m.studentteam,
        members: m.studentteam.teammember.map((tm: any) => ({
          ...tm,
          student: tm.user
        })),
        invitations: m.studentteam.teaminvitation.map((ti: any) => ({
          ...ti,
          invitedStudent: ti.user
        })),
        locked: commitment.locked,
        lockReason: commitment.locked ? commitment.reason : null,
      };

      return NextResponse.json({ data: team });
    }

    if (session.user.role === "ADMIN") {
      const whereClause: any = {};
      if (!session.user.isSuperAdmin && session.user.filiereId) {
        whereClause.filiereId = session.user.filiereId;
      }

      const teams = await prisma.studentTeam.findMany({
        where: whereClause,
        include: {
          teammember: {
            include: { user: { select: { id: true, name: true, email: true, level: true } } }
          },
          filiere: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      } as any);

      // Map for admin as well
      const mappedTeams = (teams as any[]).map(t => ({
        ...t,
        members: t.teammember.map((tm: any) => ({
          ...tm,
          student: tm.user
        }))
      }));

      return NextResponse.json({ data: mappedTeams });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("[teams GET]", error);
    return NextResponse.json({ error: "Failed to load team(s)" }, { status: 500 });
  }
}

