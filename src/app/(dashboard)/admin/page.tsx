import React from "react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/lib/services/settings.service";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;

  const currentAcademicYear = await SettingsService.getCurrentAcademicYear();
  const isSuperAdmin = session.user.isSuperAdmin;
  const filiereId = session.user.filiereId;

  const filiereFilter = (!isSuperAdmin && filiereId) ? { filiereId } : {};

  // Defaults for graceful fallback
  let studentCount = 0, teacherCount = 0, companyCount = 0, activeInternships = 0;
  let pendingConfirmations = 0, recentTopics = 0, pendingCompanyProposals = 0;
  let topicsApproved = 0, topicsRejected = 0, internshipsCompleted = 0;
  let pendingSupervisionRequests = 0;
  let pendingRegistrations: any[] = [];
  let studentsAtRisk: any[] = [];

  try {
    // ── BATCH 1: Core counts ───────────────────────────────────────────────
    [studentCount, teacherCount, companyCount, activeInternships, pendingConfirmations] =
      await Promise.all([
        prisma.studentProfile.count({
          where: { academicYear: currentAcademicYear, ...filiereFilter },
        }),
        prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
        prisma.user.count({ where: { role: "COMPANY", isActive: true } }),
        prisma.internship.count({
          where: { status: "IN_PROGRESS", academicYear: currentAcademicYear } as any,
        }),
        prisma.internship.count({
          where: { status: "PENDING_ADMIN_CONFIRMATION" } as any,
        }),
      ]);
  } catch (e: any) {
    console.error("Admin Dashboard Batch 1 Error:", e?.message);
  }

  try {
    // ── BATCH 2: Topic counts + registrations ──────────────────────────────
    [recentTopics, pendingCompanyProposals, topicsApproved, topicsRejected, pendingRegistrations] =
      await Promise.all([
        prisma.topic.count({
          where: { status: "PENDING_ADMIN", ...filiereFilter } as any,
        }),
        prisma.topic.count({
          where: { type: "COMPANY_PROPOSED", status: "PENDING_ADMIN", ...filiereFilter },
        }),
        prisma.topic.count({
          where: { status: "APPROVED", academicYear: currentAcademicYear, ...filiereFilter } as any,
        }),
        prisma.topic.count({
          where: { status: "REJECTED", academicYear: currentAcademicYear, ...filiereFilter } as any,
        }),
        prisma.registrationRequest.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, name: true, email: true, role: true, createdAt: true, status: true },
        }),
      ]);
  } catch (e: any) {
    console.error("Admin Dashboard Batch 2 Error:", e?.message);
  }

  try {
    // ── BATCH 3: Internship stats + unplaced students ──────────────────────
    [internshipsCompleted, pendingSupervisionRequests, studentsAtRisk] =
      await Promise.all([
        prisma.internship.count({
          where: { status: "COMPLETED", academicYear: currentAcademicYear } as any,
        }),
        prisma.teacherApplication.count({
          where: { status: "PENDING", ...(!isSuperAdmin && filiereId ? { topic: { filiereId } } : {}) },
        }),
        prisma.user.findMany({
          where: {
            role: "STUDENT",
            isActive: true,
            ...(!isSuperAdmin && filiereId ? { studentprofile: { filiereId } } : {}),
            studentprofile: { academicYear: currentAcademicYear },
            internshipstudent: { none: {} },
          } as any,
          select: { 
            id: true, 
            name: true, 
            email: true,
            studentProfile: { select: { level: true, filiere: { select: { name: true } } } }
          },
          take: 20,
          orderBy: { name: "asc" },
        }),
      ]);
  } catch (e: any) {
    console.error("Admin Dashboard Batch 3 Error:", e?.message);
  }

  return (
    <AdminDashboardClient
      studentCount={studentCount}
      teacherCount={teacherCount}
      companyCount={companyCount}
      activeInternships={activeInternships}
      pendingConfirmations={pendingConfirmations}
      pendingRegistrations={pendingRegistrations}
      recentTopics={recentTopics}
      currentAcademicYear={currentAcademicYear}
      pendingCompanyProposals={pendingCompanyProposals}
      initialStats={{
        topicsApproved,
        topicsRejected,
        internshipsCompleted,
        pendingSupervisionRequests,
        studentsAtRisk,
      }}
    />
  );
}
