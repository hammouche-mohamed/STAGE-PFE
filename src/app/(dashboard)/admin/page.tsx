import React from "react";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { SettingsService } from "@/lib/services/settings.service";
import { AdminDashboardClient } from "./_components/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") return null;

  const currentAcademicYear = await SettingsService.getCurrentAcademicYear();

  const [
    studentCount,
    teacherCount,
    companyCount,
    activeInternships,
    pendingConfirmations,
    pendingRegistrations,
    recentTopics,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT", isActive: true } }),
    prisma.user.count({ where: { role: "TEACHER", isActive: true } }),
    prisma.user.count({ where: { role: "COMPANY", isActive: true } }),
    prisma.internship.count({ where: { status: "IN_PROGRESS", academicYear: currentAcademicYear } }),
    prisma.internship.count({ where: { status: "PENDING_ADMIN_CONFIRMATION" } }),
    prisma.registrationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    }),
    prisma.topic.count({ where: { status: "PENDING_ADMIN" } }),
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
    />
  );
}
