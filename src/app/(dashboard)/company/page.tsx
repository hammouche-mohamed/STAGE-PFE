import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Plus,
  BookOpen,
  Users,
  Briefcase,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export default async function CompanyDashboardPage() {
  // NFR-M3 / NFR-S2: use the authenticated session — never hardcode user IDs or emails
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-gray-400">Session not found.</div>;

  const company = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      companyprofile: { select: { companyName: true } },
    },
  } as any);

  if (!company) return <div className="p-8 text-gray-400">Company profile not found.</div>;

  let stats = { topicCount: 0, applicationCount: 0, internshipCount: 0, pendingValidations: 0 };
  try {
    const [topicCount, applicationCount, internshipCount, pendingValidations] =
      await Promise.all([
        prisma.topic.count({ where: { proposedById: company.id } }),
        prisma.studentApplication.count({
          where: {
            topic: { proposedById: company.id },
            status: "PENDING",
          },
        }),
        prisma.internship.count({
          where: { topic: { proposedById: company.id } },
        }),
        // Final reports awaiting the company's own validation
        prisma.internship.count({
          where: {
            topic: { proposedById: company.id },
            status: "FINAL_REPORT_SUBMITTED",
            companyValidatedFinalReport: false,
          },
        }),
      ]);
    stats = { topicCount, applicationCount, internshipCount, pendingValidations };
  } catch (err: any) {
    console.error("[COMPANY_DASHBOARD] Fetching stats failed:", err);
    // Continue with zero stats but log it
  }

  const { topicCount, applicationCount, internshipCount, pendingValidations } = stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Partner Dashboard</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Welcome back, {(company as any).companyprofile?.companyName ?? company.name}. Manage your
            recruitment and internship tracks.
          </p>
        </div>
        <Link
          href="/company/topics/new"
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[12px] font-medium flex items-center justify-center hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          New Topic
        </Link>
      </div>

      {/* Company Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total Topics" value={topicCount} icon={BookOpen} subValue="Proposed on portal" />
        <StatsCard
          label="Active Applications"
          value={applicationCount}
          icon={Users}
          subValue="Waiting recruitment"
          subValueColor={applicationCount > 0 ? "amber" : "gray"}
        />
        <StatsCard
          label="Current Interns"
          value={internshipCount}
          icon={Briefcase}
          subValue="Working with you"
          subValueColor="green"
        />
        <StatsCard
          label="Reports to Validate"
          value={pendingValidations}
          icon={CheckCircle2}
          subValue="Your approval needed"
          subValueColor={pendingValidations > 0 ? "red" : "gray"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick links */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm space-y-4">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/company/topics"
              className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 transition-colors"
            >
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Manage Topics</span>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
            <Link
              href="/company/applications"
              className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 transition-colors"
            >
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">Review Applications</span>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
            <Link
              href="/company/internships"
              className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 transition-colors"
            >
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                Internships &amp; Final Reports
                {pendingValidations > 0 && (
                  <span className="ml-2 text-[11px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded">
                    {pendingValidations} pending
                  </span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
          </div>
        </div>

        {/* Completion workflow info */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">Internship Completion</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            When a student submits their final report, you will receive a notification to
            validate it. Once both you and the academic supervisor approve, the administrator
            will confirm the internship as complete.
          </p>
          <div className="mt-4 space-y-2 text-[12px] text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Student submits final report
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Teacher &amp; Company validate
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              Admin confirms — internship completed
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
