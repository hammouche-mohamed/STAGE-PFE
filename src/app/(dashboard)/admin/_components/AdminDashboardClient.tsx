"use client";

import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Users, UserPlus, Briefcase, BookOpen, ArrowRight,
  ShieldCheck, Clock, Bell, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Registration {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface Props {
  studentCount: number;
  teacherCount: number;
  companyCount: number;
  activeInternships: number;
  pendingConfirmations: number;
  pendingRegistrations: Registration[];
  recentTopics: number;
  currentAcademicYear: string;
}

export function AdminDashboardClient({
  studentCount,
  teacherCount,
  companyCount,
  activeInternships,
  pendingConfirmations,
  pendingRegistrations,
  recentTopics,
  currentAcademicYear,
}: Props) {
  const { t, isRTL } = useTranslation();

  return (
    <div className="space-y-6">
      <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("dashboard.recentActivity")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {t("dashboard.welcome")}, Administrator.
          </p>
        </div>
        <div className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm">
          <Clock className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-[12px] font-medium text-gray-600">
            {currentAcademicYear}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label={t("dashboard.totalStudents")} value={studentCount} icon={Users} subValue={t("common.users")} />
        <StatsCard label={t("dashboard.totalTeachers")} value={teacherCount} icon={ShieldCheck} subValue={t("nav.supervision")} />
        <StatsCard label={t("common.users")} value={companyCount} icon={Briefcase} subValue="Partners" />
        <StatsCard
          label={t("dashboard.activeInternships")}
          value={activeInternships}
          icon={Clock}
          subValue={t("status.IN_PROGRESS")}
          subValueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Registrations */}
        <div className="lg:col-span-2 space-y-4">
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <h2 className={`text-[14px] font-semibold text-gray-900 flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
              <UserPlus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} text-indigo-600`} />
              {t("common.registrations")}
            </h2>
            <Link
              href="/admin/registrations"
              className={`text-[12px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center ${isRTL ? "flex-row-reverse" : ""}`}
            >
              {t("common.view")} <ArrowRight className={`${isRTL ? "mr-1 rotate-180" : "ml-1"} h-3 w-3`} />
            </Link>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead className="admin-table-header">
                <tr>
                  <th>{t("common.name")}</th>
                  <th>{t("common.role")}</th>
                  <th>{t("common.date")}</th>
                  <th className="text-right">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  pendingRegistrations.map((req) => (
                    <tr key={req.id} className="admin-table-row">
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{req.name}</span>
                          <span className="text-[11px] text-gray-400">{req.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] font-medium text-gray-600 uppercase tracking-tighter">
                          {req.role}
                        </span>
                      </td>
                      <td>
                        <span className="text-[12px] text-gray-500">
                          {format(new Date(req.createdAt), "MMM d, HH:mm")}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          href="/admin/registrations"
                          className="text-[12px] font-medium text-indigo-600 hover:underline"
                        >
                          {t("common.view")}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status */}
        <div className="space-y-4">
          <h2 className={`text-[14px] font-semibold text-gray-900 flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
            <Bell className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} text-amber-500`} />
            {t("dashboard.recentActivity")}
          </h2>

          <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4 shadow-sm">
            {/* Topics pending admin approval */}
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-md">
              <div className="p-1.5 bg-amber-100 rounded">
                <BookOpen className="h-4 w-4 text-amber-700" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-[13px] font-medium text-amber-900">
                  {recentTopics} {t("status.PENDING_ADMIN")}
                </p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  {t("topics.pendingApproval")}
                </p>
                <Link
                  href="/admin/topics"
                  className="text-[11px] font-bold text-amber-800 uppercase mt-2 block hover:underline"
                >
                  {t("common.topics")} →
                </Link>
              </div>
            </div>

            {/* Final reports awaiting admin confirmation */}
            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-md">
              <div className="p-1.5 bg-indigo-100 rounded">
                <CheckCircle2 className="h-4 w-4 text-indigo-700" />
              </div>
              <div className={isRTL ? "text-right" : ""}>
                <p className="text-[13px] font-medium text-indigo-900">
                  {pendingConfirmations} {t("dashboard.pendingConfirmation")}
                </p>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  {t("status.PENDING_ADMIN_CONFIRMATION")}
                </p>
                <Link
                  href="/admin/internships"
                  className="text-[11px] font-bold text-indigo-800 uppercase mt-2 block hover:underline"
                >
                  {t("common.confirm")} →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
