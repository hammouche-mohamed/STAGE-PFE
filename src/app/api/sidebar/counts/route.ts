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

      const [regCount, topicCount, internCount] = await Promise.all([
        prisma.registrationRequest.count({ where: { status: "PENDING" } }),
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
          where: { internship: { teacherId: userId }, reads: { none: { userId } } },
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
          where: { internship: { topic: { proposedById: userId } }, reads: { none: { userId } } },
        })
      ]);
      counts["/company/applications"] = appCount;
      counts["/company/messages"] = msgCount;
    } else if (role === "STUDENT") {
      const [invitCount, msgCount] = await Promise.all([
        prisma.binomeInvitation.count({ 
          where: { invitedStudentId: userId, status: "PENDING" },
        }),
        prisma.message.count({
          where: {
            internship: { students: { some: { studentId: userId } } },
            reads: { none: { userId } },
          },
        })
      ]);
      counts["/student/invitations"] = invitCount;
      counts["/student/messages"] = msgCount;
    }

    if (session.user.mustChangePassword) {
      counts["/profile"] = 1;
    }

    return NextResponse.json(counts);
  } catch (error) {
    console.error("Sidebar counts error:", error);
    return NextResponse.json({}, { status: 500 });
  }
}
