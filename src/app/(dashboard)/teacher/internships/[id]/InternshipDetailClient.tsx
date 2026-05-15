"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  MapPin,
  MessageSquare,
  GraduationCap,
  Briefcase,
  Calendar,
} from "lucide-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import SetBreadcrumb from "@/components/layout/SetBreadcrumb";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export interface InternshipDetailData {
  id: string;
  status: string;
  academicYear: string;
  createdAt: string;
  midtermDeadline: string | null;
  finalDeadline: string | null;
  topic: { title: string; type: string; description: string | null };
  teacher: { name: string; email: string };
  students: { name: string; email: string }[];
  counts: { documents: number; messages: number };
}

export default function InternshipDetailClient({
  segment,
  data,
}: {
  segment: string;
  data: InternshipDetailData;
}) {
  const { t } = useTranslation();
  const fmt = (d: string) => format(new Date(d), "MMMM d, yyyy");

  return (
    <div className="space-y-6">
      <SetBreadcrumb segment={segment} label={data.topic.title} />
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/teacher/internships"
            className="inline-flex items-center gap-2 text-[13px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("internshipDetail.backToInternships" as any)}
          </Link>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={data.status} />
              <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {data.topic.type}
              </span>
            </div>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">
              {data.topic.title}
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
              {t("internshipDetail.academicYear" as any)} {data.academicYear}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 text-center">
            <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {t("internshipDetail.documents" as any)}
            </p>
            <p className="text-[18px] font-semibold text-gray-900 dark:text-white">
              {data.counts.documents}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 text-center">
            <MessageSquare className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {t("internshipDetail.messages" as any)}
            </p>
            <p className="text-[18px] font-semibold text-gray-900 dark:text-white">
              {data.counts.messages}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 text-center">
            <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {t("internshipDetail.created" as any)}
            </p>
            <p className="text-[18px] font-semibold text-gray-900 dark:text-white">
              {fmt(data.createdAt)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">
              {t("internshipDetail.projectDescription" as any)}
            </h2>
            <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed">
              {data.topic.description || t("internshipDetail.noDescription" as any)}
            </p>
          </section>

          <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white mb-4">
              {t("internshipDetail.participants" as any)}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {t("internshipDetail.supervisor" as any)}
                </p>
                <div className="rounded-md border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                      {data.teacher.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                        {data.teacher.name}
                      </p>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">
                        {data.teacher.email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {t("internshipDetail.students" as any)}
                </p>
                <div className="rounded-md border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 p-4 space-y-3">
                  {data.students.map((student) => (
                    <div key={student.email} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                          {student.name}
                        </p>
                        <p className="text-[12px] text-gray-500 dark:text-gray-400">
                          {student.email}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {(data.midtermDeadline || data.finalDeadline) && (
            <section className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-white">
                  {t("internshipDetail.keyDeadlines" as any)}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data.midtermDeadline && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-lg p-4">
                    <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                      {t("internshipDetail.midtermReport" as any)}
                    </p>
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-white mt-1">
                      {fmt(data.midtermDeadline)}
                    </p>
                  </div>
                )}
                {data.finalDeadline && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg p-4">
                    <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-widest">
                      {t("internshipDetail.finalReport" as any)}
                    </p>
                    <p className="text-[14px] font-semibold text-gray-900 dark:text-white mt-1">
                      {fmt(data.finalDeadline)}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {t("internshipDetail.topicType" as any)}
                </p>
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                  {data.topic.type}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <div>
                <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {t("internshipDetail.roomLocation" as any)}
                </p>
                <p className="text-[14px] font-semibold text-gray-900 dark:text-white">
                  {t("internshipDetail.tbd" as any)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                {t("internshipDetail.quickActions" as any)}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href={`/teacher/documents?internshipId=${data.id}`}
                className="block rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t("internshipDetail.viewDocuments" as any)}
              </Link>
              <Link
                href={`/teacher/messages?internshipId=${data.id}`}
                className="block rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-[13px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {t("internshipDetail.openMessages" as any)}
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
