"use client";

import React from "react";
import Link from "next/link";
import {
  Briefcase,
  Users,
  FileText,
  MessageSquare,
  ArrowRight,
  Clock,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface ActiveInternship {
  id: string;
  title: string;
  students: string[];
}
interface RecentMessage {
  id: string;
  internshipId: string;
  userName: string;
  topicTitle: string;
  sentAt: string;
  content: string;
}

export default function TeacherDashboardClient({
  teacherName,
  maxStudents,
  internshipCount,
  pendingApplications,
  pendingDocuments,
  pendingFinalReports,
  companyTopicCount,
  activeInternships,
  recentMessages,
}: {
  teacherName: string;
  maxStudents: number;
  internshipCount: number;
  pendingApplications: number;
  pendingDocuments: number;
  pendingFinalReports: number;
  companyTopicCount: number;
  activeInternships: ActiveInternship[];
  recentMessages: RecentMessage[];
}) {
  const { t } = useTranslation();
  const td = (k: string, params?: Record<string, any>) =>
    t(`teacherDashboard.${k}` as any, params as any);

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-bold text-gray-900 dark:text-white leading-none">
            {td("workspace")}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1.5">
            {td("welcome", { name: teacherName })}
          </p>
        </div>
      </div>

      {/* Teacher Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          label={td("supervisions")}
          value={internshipCount}
          icon={Briefcase}
          subValue={td("maxCapacity", { n: maxStudents })}
        />
        <StatsCard
          label={td("companyTopics")}
          value={companyTopicCount}
          icon={Building2}
          subValue={
            companyTopicCount > 0
              ? td("companyTopicsOpen")
              : td("companyTopicsNone")
          }
          subValueColor={companyTopicCount > 0 ? "amber" : "gray"}
        />
        <StatsCard
          label={td("applications")}
          value={pendingApplications}
          icon={Users}
          subValue={td("topicRequests")}
          subValueColor={pendingApplications > 0 ? "red" : "gray"}
        />
        <StatsCard
          label={td("documents")}
          value={pendingDocuments}
          icon={FileText}
          subValue={td("pendingReview")}
          subValueColor={pendingDocuments > 0 ? "amber" : "gray"}
        />
        <StatsCard
          label={td("finalReports")}
          value={pendingFinalReports}
          icon={ShieldCheck}
          subValue={td("validationRequired")}
          subValueColor={pendingFinalReports > 0 ? "red" : "gray"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Supervisions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center">
              <Clock className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              {td("activeSupervisions")}
            </h2>
            <Link
              href="/teacher/internships"
              className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
            >
              {td("viewAll")} <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {activeInternships.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-10 text-center shadow-sm">
                <Briefcase className="h-10 w-10 text-gray-100 dark:text-gray-800 mx-auto mb-3" />
                <p className="text-[13px] text-gray-400 dark:text-gray-500">
                  {td("noActiveSupervisions")}
                </p>
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
                        {internship.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {internship.students.join(" · ")}
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

        {/* Sidebar: Recent Activity */}
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
              {td("recentActivity")}
            </h2>
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl p-1 shadow-sm">
              {recentMessages.length === 0 ? (
                <p className="p-6 text-center text-[12px] text-gray-400">
                  {td("noRecentMessages")}
                </p>
              ) : (
                recentMessages.map((m) => (
                  <Link
                    key={m.id}
                    href={`/teacher/messages?internshipId=${m.internshipId}`}
                    className="block p-3 border-b border-gray-50 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">
                        {m.userName}
                      </p>
                      <span className="text-[9px] text-gray-400 dark:text-gray-500 shrink-0 font-medium uppercase tracking-tighter">
                        {new Date(m.sentAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p
                      className="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5"
                      title={m.topicTitle}
                    >
                      {m.topicTitle}
                    </p>
                    <p className="text-[12px] text-gray-600 dark:text-gray-300 line-clamp-1 mt-1 italic">
                      &quot;{m.content.replace(/^↩ .*?\n\n/, "").slice(0, 50)}...&quot;
                    </p>
                  </Link>
                ))
              )}
              <Link
                href="/teacher/messages"
                className="block p-3 text-center text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors rounded-b-xl border-t border-gray-50 dark:border-slate-800"
              >
                {td("openAllMessages")} →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
