import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const userId = session.user.id;
    const counts: Record<string, number> = {};

    if (role === "ADMIN") {
      const filiereId = session.user.isSuperAdmin ? null : session.user.filiereId;

      let regWhere: Record<string, any> = { status: "PENDING" };
      if (!session.user.isSuperAdmin) {
        if (!filiereId) {
          regWhere = { id: "__none__" };
        } else {
          const filiere = await prisma.filiere.findUnique({
            where: { id: filiereId },
            select: { name: true, code: true },
          });
          const matchValues = [filiere?.name, filiere?.code].filter(Boolean) as string[];
          regWhere = {
            status: "PENDING",
            role: { in: ["STUDENT", "TEACHER"] },
            ...(matchValues.length > 0 ? { speciality: { in: matchValues } } : { speciality: "__none__" }),
          };
        }
      }

      const [regCount, topicCount, acceptedAppCount, internCount] = await Promise.all([
        prisma.registrationRequest.count({ where: regWhere as any }),
        prisma.topic.count({
          where: {
            status: "PENDING_ADMIN",
            archivedAt: null,
            ...(filiereId ? { filiereId } : {})
          } as any,
        }),
        // Company has validated a team — the admin now has to confirm it to
        // start the internship. Topic not yet TAKEN means no internship was
        // created from it yet, so the application is still actionable.
        prisma.studentApplication.count({
          where: {
            status: "ACCEPTED",
            topic: {
              type: "COMPANY_PROPOSED",
              status: { not: "TAKEN" },
              archivedAt: null,
              ...(filiereId ? { filiereId } : {}),
            },
          } as any,
        }),
        prisma.internship.count({
          where: {
            status: "REQUESTED",
            ...(filiereId ? { topic: { filiereId } } : {})
          } as any,
        })
      ]);

      counts["/admin/registrations"] = regCount;
      // The Topics nav item flags both pending student/company proposals AND
      // company-accepted applications waiting for the admin to create the
      // internship (the notification links to /admin/topics/[id]).
      counts["/admin/topics"] = topicCount + acceptedAppCount;
      counts["/admin/internships"] = internCount;
    } else if (role === "TEACHER") {
      const [internCount, docCount, msgCount] = await Promise.all([
        prisma.internship.count({ where: { teacherId: userId, status: "REQUESTED" } }),
        prisma.document.count({
          where: { internship: { teacherId: userId }, status: "UPLOADED" },
        }),
        prisma.message.count({
          where: {
            internship: { teacherId: userId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
            senderId: { not: userId },
            messageread: { none: { userId } },
          } as any,
        })
      ]);
      counts["/teacher/internships"] = internCount;
      counts["/teacher/documents"] = docCount;
      counts["/teacher/messages"] = msgCount;
    } else if (role === "COMPANY") {
      const [appCount, msgCount, docCount] = await Promise.all([
        prisma.studentApplication.count({
          where: { topic: { proposedById: userId }, status: "PENDING" },
        }),
        prisma.message.count({
          where: {
            internship: {
              topic: { proposedById: userId },
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
            senderId: { not: userId },
            messageread: { none: { userId } },
          } as any,
        }),
        // Documents uploaded on this company's internships awaiting its review
        prisma.document.count({
          where: {
            internship: { topic: { proposedById: userId } },
            status: "UPLOADED",
          },
        }),
      ]);
      counts["/company/applications"] = appCount;
      counts["/company/messages"] = msgCount;
      counts["/company/internships"] = docCount;
    } else if (role === "STUDENT") {
      const [invitCount, msgCount] = await Promise.all([
        // The student Invitations page lists TeamInvitation rows (via
        // /api/teams/invitations) — count the SAME table so the badge
        // matches what the student actually sees.
        prisma.teamInvitation.count({
          where: { invitedStudentId: userId, status: "PENDING" },
        }),
        prisma.message.count({
          where: {
            internship: {
              internshipstudent: { some: { studentId: userId } },
              status: { notIn: ["COMPLETED", "CANCELLED"] },
            },
            senderId: { not: userId },
            messageread: { none: { userId } },
          } as any,
        })
      ]);
      counts["/student/invitations"] = invitCount;
      counts["/student/messages"] = msgCount;
    }

    if (session.user.mustChangePassword) {
      counts["/profile"] = 1;
    }

    const response = NextResponse.json(counts);
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Sidebar counts error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
