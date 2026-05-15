"use client";

import React from "react";
import Link from "next/link";
import { Plus, BookOpen, Users, Briefcase, ArrowRight, CheckCircle2 } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function CompanyDashboardClient({
  companyName,
  topicCount,
  applicationCount,
  internshipCount,
  pendingValidations,
}: {
  companyName: string;
  topicCount: number;
  applicationCount: number;
  internshipCount: number;
  pendingValidations: number;
}) {
  const { t } = useTranslation();
  const c = (k: string, params?: Record<string, any>) =>
    t(`company.dash.${k}` as any, params as any);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">
            {c("title")}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {c("welcome", { name: companyName })}
          </p>
        </div>
        <Link
          href="/company/topics/new"
          className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[12px] font-medium flex items-center justify-center hover:bg-indigo-700 transition-colors w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1" />
          {c("newTopic")}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label={c("totalTopics")} value={topicCount} icon={BookOpen} subValue={c("proposedOnPortal")} />
        <StatsCard
          label={c("activeApplications")}
          value={applicationCount}
          icon={Users}
          subValue={c("waitingRecruitment")}
          subValueColor={applicationCount > 0 ? "amber" : "gray"}
        />
        <StatsCard
          label={c("currentInterns")}
          value={internshipCount}
          icon={Briefcase}
          subValue={c("workingWithYou")}
          subValueColor="green"
        />
        <StatsCard
          label={c("reportsToValidate")}
          value={pendingValidations}
          icon={CheckCircle2}
          subValue={c("approvalNeeded")}
          subValueColor={pendingValidations > 0 ? "red" : "gray"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm space-y-4">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white">
            {c("quickActions")}
          </h2>
          <div className="space-y-3">
            <Link
              href="/company/topics"
              className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 transition-colors"
            >
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                {c("manageTopics")}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
            <Link
              href="/company/applications"
              className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 transition-colors"
            >
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                {c("reviewApplications")}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
            <Link
              href="/company/internships"
              className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-slate-800 border border-gray-100 dark:border-slate-800 transition-colors"
            >
              <span className="text-[13px] font-medium text-gray-800 dark:text-gray-200">
                {c("internshipsFinalReports")}
                {pendingValidations > 0 && (
                  <span className="ml-2 text-[11px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded">
                    {pendingValidations} {c("pending")}
                  </span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 dark:text-gray-500" />
            </Link>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <h2 className="text-[14px] font-semibold text-gray-900 dark:text-white mb-4">
            {c("completion")}
          </h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            {c("completionDesc")}
          </p>
          <div className="mt-4 space-y-2 text-[12px] text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              {c("step1")}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              {c("step2")}
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              {c("step3")}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
