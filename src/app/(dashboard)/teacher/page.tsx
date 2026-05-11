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
    activeInternships,
    recentMessages
  ] = await Promise.all([
    prisma.internship.count({ where: { teacherId: teacher.id, status: "IN_PROGRESS" } }),
    prisma.teacherApplication.count({ where: { teacherId: teacher.id, status: "PENDING" } }),
    prisma.document.count({
      where: {
        internship: { teacherId: teacher.id },
        status: "UPLOADED",
      },
    }),
    prisma.internship.count({
      where: {
        teacherId: teacher.id,
        status: "FINAL_REPORT_SUBMITTED",
        teacherValidatedFinalReport: false,
      },
    }),
    prisma.internship.findMany({
      where: { teacherId: teacher.id, status: "IN_PROGRESS" },
      include: {
        topic: { select: { title: true } },
        students: { include: { student: { select: { name: true } } } },
      },
      take: 5,
      orderBy: { updatedAt: "desc" }
    }),
    prisma.message.findMany({
      where: { internship: { teacherId: teacher.id } },
      include: {
        sender: { select: { name: true } },
        internship: { select: { topic: { select: { title: true } } } }
      },
      take: 4,
      orderBy: { sentAt: "desc" }
    })
  ]);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-bold text-gray-900 dark:text-white leading-none">Teacher Workspace</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">
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
          subValueColor={pendingDocuments > 0 ? "amber" : "gray"}
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
        {/* Active Supervisions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center">
              <Clock className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Active Supervisions
            </h2>
            <Link
              href="/teacher/internships"
              className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {activeInternships.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-10 text-center shadow-sm">
                <Briefcase className="h-10 w-10 text-gray-100 dark:text-gray-800 mx-auto mb-3" />
                <p className="text-[13px] text-gray-400 dark:text-gray-500">No active supervisions found.</p>
              </div>
            ) : (
              activeInternships.map((internship) => (
                <Link
                  key={internship.id}
                  href={`/teacher/internships/${internship.id}`}
                  className="block bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors">
                        {internship.topic.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {internship.students.map(s => s.student.name).join(" · ")}
                      </p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar: Messages & Resources */}
        <div className="space-y-6">
          {/* Recent Messages */}
          <div className="space-y-4">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              Recent Activity
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              {recentMessages.length === 0 ? (
                <p className="p-6 text-center text-[12px] text-gray-400">No recent messages.</p>
              ) : (
                recentMessages.map((m) => (
                  <div key={m.id} className="p-3 border-b border-gray-50 dark:border-slate-800 last:border-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">{m.sender.name}</p>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0 font-medium uppercase tracking-tighter">
                        {new Date(m.sentAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5" title={m.internship.topic.title}>
                      {m.internship.topic.title}
                    </p>
                    <p className="text-[12px] text-gray-600 dark:text-gray-300 line-clamp-1 mt-1 italic">
                      &quot;{m.content.replace(/^↩ .*?\n\n/, "").slice(0, 50)}...&quot;
                    </p>
                  </div>
                ))
              )}
              <Link href="/teacher/messages" className="block p-3 text-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors rounded-b-xl border-t border-gray-50 dark:border-slate-800">
                Open All Messages →
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
