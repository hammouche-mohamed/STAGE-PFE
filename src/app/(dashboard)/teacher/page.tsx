import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Users,
  Briefcase,
  FileText,
  MessageSquare,
  ArrowRight,
  Plus,
  Clock,
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function TeacherDashboardPage() {
  // NFR-M3 / NFR-S2: use the authenticated session — never hardcode user IDs or emails
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-gray-400">Session not found.</div>;

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      teacherProfile: { select: { maxStudents: true, currentLoad: true } },
    },
  });

  if (!teacher) return <div className="p-8 text-gray-400">Teacher profile not found.</div>;

  const [
    internshipCount,
    pendingApplications,
    pendingDocuments,
    pendingFinalReports,
  ] = await Promise.all([
    prisma.internship.count({ where: { teacherId: teacher.id, status: "IN_PROGRESS" } }),
    prisma.teacherApplication.count({ where: { teacherId: teacher.id, status: "PENDING" } }),
    prisma.document.count({
      where: {
        internship: { teacherId: teacher.id },
        status: "UPLOADED",
      },
    }),
    // Final reports awaiting the teacher's own validation
    prisma.internship.count({
      where: {
        teacherId: teacher.id,
        status: "FINAL_REPORT_SUBMITTED",
        teacherValidatedFinalReport: false,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Teacher Workspace</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Welcome back, {teacher.name}. Monitor your student supervisions and academic progress.
          </p>
        </div>
      </div>

      {/* Teacher Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="Active Supervisions"
          value={internshipCount}
          icon={Briefcase}
          subValue={`${teacher.teacherProfile?.maxStudents ?? 5} max capacity`}
        />
        <StatsCard
          label="Topic Applications"
          value={pendingApplications}
          icon={Users}
          subValue="Waiting review"
          subValueColor={pendingApplications > 0 ? "red" : "gray"}
        />
        <StatsCard
          label="Reports to Review"
          value={pendingDocuments}
          icon={FileText}
          subValue="Uploaded, pending approval"
          subValueColor={pendingDocuments > 0 ? ("amber" as "green") : "gray"}
        />
        <StatsCard
          label="Final Reports Pending"
          value={pendingFinalReports}
          icon={MessageSquare}
          subValue="Your validation required"
          subValueColor={pendingFinalReports > 0 ? "red" : "gray"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick link to supervisions */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-indigo-600" />
              Active Internships
            </h2>
            <Link
              href="/teacher/internships"
              className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-8 text-center text-gray-400 text-[13px] shadow-sm">
            <Link
              href="/teacher/internships"
              className="text-indigo-600 hover:underline font-medium"
            >
              Open Supervisions →
            </Link>
          </div>
        </div>

        {/* Resources */}
        <div className="space-y-4">
          <h2 className="text-[14px] font-semibold text-gray-900">Resources</h2>
          <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3 shadow-sm">
            <div className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer">
              <p className="text-[13px] font-medium text-gray-900">Template: Final Report</p>
              <p className="text-[11px] text-gray-500">Official ESST PFE template (.docx)</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer">
              <p className="text-[13px] font-medium text-gray-900">Validation Workflow</p>
              <p className="text-[11px] text-gray-500">
                How to validate a student&apos;s final report.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
