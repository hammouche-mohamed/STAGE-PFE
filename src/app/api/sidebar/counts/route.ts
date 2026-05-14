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

      // FR-A1: scope the registrations badge to the dept admin's filière.
      // Match the same speciality-by-filière-name rule used by the API.
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

      const [regCount, topicCount, internCount] = await Promise.all([
        prisma.registrationRequest.count({ where: regWhere as any }),
        prisma.topic.count({
          where: {
            status: "PENDING_ADMIN",
            ...(filiereId ? { filiereId } : {})
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
      counts["/admin/topics"] = topicCount;
      counts["/admin/internships"] = internCount;
    } else if (role === "TEACHER") {
      const [internCount, docCount, msgCount] = await Promise.all([
        prisma.internship.count({ where: { teacherId: userId, status: "REQUESTED" } }),
        prisma.document.count({ 
          where: { internship: { teacherId: userId }, status: "UPLOADED" },
        }),
        prisma.message.count({
          where: { internship: { teacherId: userId }, messageread: { none: { userId } } } as any,
        })
      ]);
      counts["/teacher/internships"] = internCount;
      counts["/teacher/documents"] = docCount;
      counts["/teacher/messages"] = msgCount;
    } else if (role === "COMPANY") {
      const [appCount, msgCount] = await Promise.all([
        prisma.studentApplication.count({ 
          where: { topic: { proposedById: userId }, status: "PENDING" },
        }),
        prisma.message.count({
          where: { internship: { topic: { proposedById: userId } }, messageread: { none: { userId } } } as any,
        })
      ]);
      counts["/company/applications"] = appCount;
      counts["/company/messages"] = msgCount;
    } else if (role === "STUDENT") {
      const [invitCount, msgCount] = await Promise.all([
        prisma.binomeinvitation.count({ 
          where: { invitedStudentId: userId, status: "PENDING" },
        }),
        prisma.message.count({
          where: {
            internship: { internshipstudent: { some: { studentId: userId } } },
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
    // Short cache to prevent hammering DB on every page navigation
    response.headers.set("Cache-Control", "private, max-age=10, stale-while-revalidate=30");
    return response;
  } catch (error) {
    console.error("Sidebar counts error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
