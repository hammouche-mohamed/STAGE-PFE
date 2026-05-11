"use client";

import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import {
  Users, UserPlus, Briefcase, BookOpen, ArrowRight,
  ShieldCheck, Clock, Bell, CheckCircle2, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";

interface Registration {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
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
  studentCount: initialStudentCount,
  teacherCount: initialTeacherCount,
  companyCount: initialCompanyCount,
  activeInternships: initialActiveInternships,
  pendingConfirmations: initialPendingConfirmations,
  pendingRegistrations,
  recentTopics: initialRecentTopics,
  currentAcademicYear,
}: Props) {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  const [filiereId, setFiliereId] = React.useState<string>("all");
  const [filieres, setFilieres] = React.useState<any[]>([]);
  const [stats, setStats] = React.useState({
    studentCount: initialStudentCount,
    teacherCount: initialTeacherCount,
    companyCount: initialCompanyCount,
    activeInternships: initialActiveInternships,
    pendingConfirmations: initialPendingConfirmations,
    recentTopics: initialRecentTopics,
  });
  const [isLoadingStats, setIsLoadingStats] = React.useState(false);

  React.useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetch("/api/filieres")
        .then(res => res.json())
        .then(data => setFilieres(data.data || []));
    }
  }, [session]);

  const fetchStats = React.useCallback(async (fid: string) => {
    setIsLoadingStats(true);
    try {
      const res = await fetch(`/api/admin/dashboard/stats?filiereId=${fid}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch dashboard stats");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  React.useEffect(() => {
    if (filiereId !== "all") {
      fetchStats(filiereId);
    } else if (session?.user?.isSuperAdmin) {
      fetchStats("all");
    }
  }, [filiereId, fetchStats, session]);

  const currentFiliere = filieres.find(f => f.id === session?.user?.filiereId);

  const { studentCount, teacherCount, companyCount, activeInternships, pendingConfirmations, recentTopics } = stats;

  if (session?.user?.role === "ADMIN" && !session?.user?.isSuperAdmin && !session?.user?.filiereId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 mt-10">
        <div className="bg-amber-100 text-amber-600 p-4 rounded-full">
          <AlertCircle className="h-12 w-12" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Department Assignment Required</h2>
        <p className="text-gray-500 max-w-md">
          You are currently an unassigned administrator. You must be assigned to a department (filière) by a Super Administrator before you can view dashboard data or manage users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
        <div className={isRTL ? "text-right" : ""}>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("dashboard.recentActivity")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {t("dashboard.welcome")}, {session?.user?.isSuperAdmin ? "Global Administrator" : "Department Administrator"}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!session?.user?.isSuperAdmin && currentFiliere && (
            <div className="flex items-center px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-md shadow-sm h-9 flex-shrink-0 transition-colors">
              <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight whitespace-nowrap">
                {currentFiliere.name}
              </span>
            </div>
          )}
          {session?.user?.isSuperAdmin && (
            <select
              className="admin-input text-[12px] h-9 py-0 min-w-[150px] sm:min-w-[200px] flex-1 sm:flex-none"
              value={filiereId}
              onChange={(e) => setFiliereId(e.target.value)}
              disabled={isLoadingStats}
            >
              <option value="all">All Departments</option>
              {filieres.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-sm h-9 flex-shrink-0 transition-colors">
            <Clock className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 flex-shrink-0" />
            <span className="text-[12px] font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
              {currentAcademicYear}
            </span>
          </div>
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
        <div className={`${session?.user?.isSuperAdmin ? "lg:col-span-3" : "lg:col-span-2"} space-y-6`}>
          {/* Department Overview */}
          <div className="space-y-4">
            <h2 className={`text-[14px] font-semibold text-gray-900 dark:text-white flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
              <CheckCircle2 className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} text-indigo-600 dark:text-indigo-400`} />
              {t("dashboard.pipelineStatus", { defaultValue: "Department Overview" })}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm transition-colors">
                <p className="text-[12px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Topics Status</p>
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">Approved</span>
                    <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">{(stats as any).topicsApproved || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">Pending Review</span>
                    <span className="text-[13px] font-bold text-amber-600 dark:text-amber-400">{recentTopics}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">Rejected</span>
                    <span className="text-[13px] font-bold text-red-600 dark:text-red-400">{(stats as any).topicsRejected || 0}</span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800 mt-1">
                    <span className="text-[12px] font-medium text-gray-500 dark:text-gray-400">Supervision Requests</span>
                    <span className="text-[12px] font-bold text-indigo-600 dark:text-indigo-400">{(stats as any).pendingSupervisionRequests || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm transition-colors">
                <p className="text-[12px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Internships Status</p>
                <div className="flex flex-col gap-3 w-full">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">Active (In Progress)</span>
                    <span className="text-[13px] font-bold text-indigo-600 dark:text-indigo-400">{activeInternships}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-gray-600 dark:text-gray-300">Completed</span>
                    <span className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400">{(stats as any).internshipsCompleted || 0}</span>
                  </div>
                  <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50 dark:border-gray-800 w-full">
                    <Link href="/admin/internships" className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 uppercase tracking-wider">
                      View All
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Placement Tracking */}
          <div className="space-y-4">
            <h2 className={`text-[14px] font-semibold text-gray-900 dark:text-white flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
              <AlertCircle className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} text-amber-600 dark:text-amber-400`} />
              {t("dashboard.placementTracking", { defaultValue: "Placement Tracking" })}
            </h2>
            <div className="bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-900/30 rounded-xl shadow-sm overflow-hidden transition-colors">
              <div className="bg-amber-50 dark:bg-amber-900/20 px-4 py-3 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-amber-800 dark:text-amber-300">Students without active internships</span>
                <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-100 text-[10px] font-bold rounded-full">
                  {((stats as any).studentsAtRisk?.length) || 0} {t("common.users")}
                </span>
              </div>
              <div className={`divide-y divide-gray-100 dark:divide-gray-800 ${session?.user?.isSuperAdmin ? "grid grid-cols-1 md:grid-cols-2" : "max-h-[300px] overflow-y-auto"}`}>
                {!((stats as any).studentsAtRisk) || (stats as any).studentsAtRisk.length === 0 ? (
                  <div className={`p-6 text-center text-[12px] text-gray-400 dark:text-gray-500 ${session?.user?.isSuperAdmin ? "md:col-span-2" : ""}`}>
                    All students are successfully placed!
                  </div>
                ) : (
                  (stats as any).studentsAtRisk.map((student: any) => (
                    <div key={student.id} className="flex items-center justify-between p-4 hover:bg-amber-50/30 dark:hover:bg-amber-900/10 transition-colors border-r border-gray-50 dark:border-gray-800">
                      <div className="flex flex-col">
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white">{student.name}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400">{student.email}</span>
                      </div>
                      <Link href={`/admin/users?search=${encodeURIComponent(student.email)}`} className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-[11px] font-bold rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm">
                        Contact
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {!session?.user?.isSuperAdmin && (
          <div className="space-y-4">
            <h2 className={`text-[14px] font-semibold text-gray-900 dark:text-white flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
              <Bell className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} text-amber-500 dark:text-amber-400`} />
              {t("dashboard.recentActivity")}
            </h2>

            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 space-y-4 shadow-sm h-full">
              <div className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 rounded-md">
                <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded">
                  <BookOpen className="h-4 w-4 text-amber-700 dark:text-amber-400" />
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-[13px] font-medium text-amber-900 dark:text-amber-100">
                    {recentTopics} {t("status.PENDING_ADMIN")}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                    {t("topics.pendingApproval")}
                  </p>
                  <Link
                    href="/admin/topics"
                    className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase mt-2 block hover:underline"
                  >
                    {t("common.topics")} →
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-md">
                <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/30 rounded">
                  <CheckCircle2 className="h-4 w-4 text-indigo-700 dark:text-indigo-400" />
                </div>
                <div className={isRTL ? "text-right" : ""}>
                  <p className="text-[13px] font-medium text-indigo-900 dark:text-indigo-100">
                    {pendingConfirmations} {t("dashboard.pendingConfirmation")}
                  </p>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-400 mt-0.5">
                    {t("status.PENDING_ADMIN_CONFIRMATION")}
                  </p>
                  <Link
                    href="/admin/internships"
                    className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400 uppercase mt-2 block hover:underline"
                  >
                    {t("common.confirm")} →
                  </Link>
                </div>
              </div>

              {(stats as any).pendingSupervisionRequests > 0 && (
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/50 rounded-md">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                    <UserPlus className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <div className={isRTL ? "text-right" : ""}>
                    <p className="text-[13px] font-medium text-emerald-900 dark:text-emerald-100">
                      {(stats as any).pendingSupervisionRequests} Supervision Requests
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                      Teachers waiting for assignment
                    </p>
                    <Link
                      href="/admin/topics"
                      className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400 uppercase mt-2 block hover:underline"
                    >
                      Manage →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pending Registrations (Super Admin Only) */}
      {session?.user?.isSuperAdmin && (
        <div className="space-y-4 pt-8 mt-8 border-t border-gray-100 dark:border-gray-800">
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <h2 className={`text-[14px] font-semibold text-gray-900 dark:text-white flex items-center ${isRTL ? "flex-row-reverse" : ""}`}>
              <UserPlus className={`h-4 w-4 ${isRTL ? "ml-2" : "mr-2"} text-indigo-600 dark:text-indigo-400`} />
              {t("common.registrations")}
            </h2>
            <Link
              href="/admin/registrations"
              className={`text-[12px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center ${isRTL ? "flex-row-reverse" : ""}`}
            >
              {t("common.view")} <ArrowRight className={`${isRTL ? "mr-1 rotate-180" : "ml-1"} h-3 w-3`} />
            </Link>
          </div>

          <div className="admin-table-container">
            <table className="admin-table stacked-table">
              <thead className="admin-table-header">
                <tr>
                  <th className="w-[40%]">{t("common.name")}</th>
                  <th className="w-[20%] text-center">{t("common.role")}</th>
                  <th className="w-[20%] text-center">{t("common.date")}</th>
                  <th className="w-[20%] text-right pr-6">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegistrations.length === 0 ? (
                  <tr className="empty-row">
                    <td colSpan={4} className="text-center py-8 text-gray-400">
                      {t("common.noData")}
                    </td>
                  </tr>
                ) : (
                  pendingRegistrations.map((req) => (
                    <tr key={req.id} className="admin-table-row">
                      <td data-label={t("common.name")}>
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{req.name}</span>
                          <span className="text-[11px] text-gray-400 dark:text-slate-300">{req.email}</span>
                        </div>
                      </td>
                      <td data-label={t("common.role")} className="text-center">
                        <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400 uppercase tracking-tighter">
                          {req.role}
                        </span>
                      </td>
                      <td data-label={t("common.date")} className="text-center">
                        <span className="text-[12px] text-gray-500 dark:text-gray-400">
                          {format(new Date(req.createdAt), "MMM d, HH:mm")}
                        </span>
                      </td>
                      <td data-label={t("common.status")} className="text-right pr-6">
                        <span className="px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded uppercase tracking-wider border border-amber-100 dark:border-amber-900/40">
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
