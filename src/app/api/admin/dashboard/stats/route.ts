import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/lib/services/settings.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filiereId = searchParams.get("filiereId");
  const currentAcademicYear = await SettingsService.getCurrentAcademicYear();
  const yearFilter = currentAcademicYear && currentAcademicYear !== "N/A" ? { academicYear: currentAcademicYear } : {};

  // If not super admin, they can only see their own filiere
  const targetFiliereId = session.user.isSuperAdmin ? (filiereId === "all" ? null : filiereId) : session.user.filiereId;

  try {
    const [
      studentCount,
      teacherCount,
      companyCount,
      activeInternships,
      pendingConfirmations,
      recentTopics,
      topicsApproved,
      topicsRejected,
      internshipsCompleted,
      pendingSupervisionRequests,
      studentsAtRisk,
      pendingCompanyProposals,
    ] = await Promise.all([
      prisma.user.count({ 
        where: { 
          role: "STUDENT", 
          isActive: true,
          ...(targetFiliereId ? { studentProfile: { filiereId: targetFiliereId } } : {})
        } 
      }),
      prisma.user.count({ 
        where: { 
          role: "TEACHER", 
          isActive: true,
          ...(targetFiliereId ? { teacherProfile: { filiereId: targetFiliereId } } : {})
        } 
      }),
      prisma.user.count({ where: { role: "COMPANY", isActive: true } }),
      prisma.internship.count({ 
        where: { 
          status: "IN_PROGRESS", 
          ...yearFilter,
          ...(targetFiliereId ? { topic: { filiereId: targetFiliereId } } : {})
        } as any
      }),
      prisma.internship.count({ 
        where: { 
          status: "PENDING_ADMIN_CONFIRMATION",
          ...(targetFiliereId ? { topic: { filiereId: targetFiliereId } } : {})
        } as any
      }),
      prisma.topic.count({ 
        where: { 
          status: "PENDING_ADMIN",
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {})
        } as any
      }),
      prisma.topic.count({ 
        where: { 
          status: "APPROVED",
          ...yearFilter,
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {})
        } as any
      }),
      prisma.topic.count({ 
        where: { 
          status: "REJECTED",
          ...yearFilter,
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {})
        } as any
      }),
      prisma.internship.count({ 
        where: { 
          status: "COMPLETED",
          ...yearFilter,
          ...(targetFiliereId ? { topic: { filiereId: targetFiliereId } } : {})
        } as any
      }),
      prisma.teacherApplication.count({
        where: {
          status: "PENDING",
          ...(targetFiliereId ? { topic: { filiereId: targetFiliereId } } : {})
        }
      }),
      prisma.user.findMany({
        where: {
          role: "STUDENT",
          isActive: true,
          ...(targetFiliereId ? { studentProfile: { filiereId: targetFiliereId } } : {}),
          studentProfile: {
             academicYear: currentAcademicYear
          },
          internshipStudents: { none: {} }
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
        take: 20, // Increased to show more unplaced students
        orderBy: { name: 'asc' }
      }),
      prisma.topic.count({
        where: {
          type: "COMPANY_PROPOSED",
          status: "PENDING_ADMIN",
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {})
        }
      }),
    ]);

    const response = NextResponse.json({
      studentCount,
      teacherCount,
      companyCount,
      activeInternships,
      pendingConfirmations,
      recentTopics,
      topicsApproved,
      topicsRejected,
      internshipsCompleted,
      pendingSupervisionRequests,
      studentsAtRisk,
      pendingCompanyProposals,
    });

    // Cache for 30s to avoid hammering the DB with repeated filter clicks
    response.headers.set("Cache-Control", "private, max-age=30, stale-while-revalidate=60");
    return response;
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
