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
  
  const currentAcademicYearResult = await prisma.systemSettings.findUnique({
    where: { key: "currentAcademicYear" }
  });
  const currentAcademicYear = currentAcademicYearResult?.value || "N/A";
  const yearFilter = currentAcademicYear && currentAcademicYear !== "N/A" ? { academicYear: currentAcademicYear } : {};

  // If not super admin, they can only see their own filiere
  const targetFiliereId = session.user.isSuperAdmin ? (filiereId === "all" ? null : filiereId) : (session.user.filiereId || null);

  console.log(`[DASHBOARD_STATS] Filter: filiereId=${filiereId}, targetFiliereId=${targetFiliereId}, year=${currentAcademicYear}`);

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
      // Align with SSR: Count from StudentProfile to ensure academicYear filter works correctly
      prisma.studentProfile.count({ 
        where: { 
          ...yearFilter,
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {})
        } as any
      }),
      // Teachers don't usually have academic year, but they have a filiere
      prisma.user.count({ 
        where: { 
          role: "TEACHER", 
          isActive: true,
          ...(targetFiliereId ? { teacherprofile: { filiereId: targetFiliereId } } : {} as any)
        } as any
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
        } as any
      }),
      prisma.user.findMany({
        where: {
          role: "STUDENT",
          isActive: true,
          studentprofile: {
            academicYear: currentAcademicYear,
            ...(targetFiliereId ? { filiereId: targetFiliereId } : {} as any),
          },
          internshipstudent: { none: {} },
        } as any,
        select: { 
          id: true, 
          name: true, 
          email: true,
          studentprofile: { select: { level: true, filiere: { select: { name: true } } } }
        },
        take: 20,
        orderBy: { name: "asc" },
      }),
      prisma.topic.count({
        where: {
          type: "COMPANY_PROPOSED",
          status: "PENDING_ADMIN",
          ...(targetFiliereId ? { filiereId: targetFiliereId } : {})
        } as any
      }),
    ]);

    return NextResponse.json({
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
  } catch (error: any) {
    console.error("[DASHBOARD_STATS_ERROR]", error?.message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
