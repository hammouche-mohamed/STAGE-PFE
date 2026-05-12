import React from "react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/lib/services/settings.service";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;

  const currentAcademicYear = await SettingsService.getCurrentAcademicYear();

  const isSuperAdmin = session.user.isSuperAdmin;
  const filiereId = session.user.filiereId;

  // Pre-fetch topic IDs for this filiere to bypass missing Prisma relations
  const filiereTopicIds = (!isSuperAdmin && filiereId)
    ? (await prisma.topic.findMany({ where: { filiereId }, select: { id: true } })).map(t => t.id)
    : null;

  const [
    studentCount,
    teacherCount,
    companyCount,
    activeInternships,
    pendingConfirmations,
    pendingRegistrations,
    recentTopics,
    pendingCompanyProposals,
  ] = await Promise.all([
    prisma.studentProfile.count({ 
      where: { 
        academicYear: currentAcademicYear,
        ...( !isSuperAdmin && filiereId ? { filiereId } : {} )
      } 
    }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    prisma.user.count({ where: { role: "COMPANY", isActive: true } }),
    prisma.internship.count({ 
      where: { 
        status: "IN_PROGRESS", 
        academicYear: currentAcademicYear,
        ...( filiereTopicIds ? { topicId: { in: filiereTopicIds } } : {} )
      }
    }),
    prisma.internship.count({ 
      where: { 
        status: "PENDING_ADMIN_CONFIRMATION",
        ...( filiereTopicIds ? { topicId: { in: filiereTopicIds } } : {} )
      }
    }),
    prisma.registrationRequest.findMany({
      where: { 
        status: "PENDING",
        // Registration requests are usually global, but we could scope them if needed
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true, status: true },
    }),
    prisma.topic.count({ 
      where: { 
        status: "PENDING_ADMIN",
        ...( !isSuperAdmin && filiereId ? { filiereId } : {} )
      } as any
    }),
    prisma.topic.count({
      where: {
        type: "COMPANY_PROPOSED",
        status: "PENDING_ADMIN",
        ...( !isSuperAdmin && filiereId ? { filiereId } : {} )
      }
    }),
    prisma.topic.count({ 
      where: { 
        status: "APPROVED",
        academicYear: currentAcademicYear,
        ...( !isSuperAdmin && filiereId ? { filiereId } : {} )
      } as any
    }),
    prisma.topic.count({ 
      where: { 
        status: "REJECTED",
        academicYear: currentAcademicYear,
        ...( !isSuperAdmin && filiereId ? { filiereId } : {} )
      } as any
    }),
    prisma.internship.count({ 
      where: { 
        status: "COMPLETED",
        academicYear: currentAcademicYear,
        ...( filiereTopicIds ? { topicId: { in: filiereTopicIds } } : {} )
      }
    }),
    prisma.teacherApplication.count({
      where: {
        status: "PENDING",
        ...( !isSuperAdmin && filiereId ? { topic: { filiereId } } : {} )
      }
    }),
    prisma.user.findMany({
      where: {
        role: "STUDENT",
        isActive: true,
        ...( !isSuperAdmin && filiereId ? { studentProfile: { filiereId } } : {} ),
        studentProfile: { academicYear: currentAcademicYear },
        internshipStudents: { none: {} }
      },
      select: { id: true, name: true, email: true },
      take: 20,
      orderBy: { name: 'asc' }
    }),
  ]);

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
