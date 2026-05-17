"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useApi } from "@/lib/swr/useApi";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Filter,
  GraduationCap,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  FileText
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { InternshipTypeBadge } from "@/components/ui/InternshipTypeBadge";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

interface Internship {
  id: string;
  topic: {
    title: string;
    type: string;
    internshipType?: string | null;
    targetLevels?: string | null;
    filiere?: { id: string; name: string; code?: string } | null;
  };
  teacher: { name: string; filiereName?: string };
  students: {
    isLeader?: boolean;
    student: { name: string; email: string; level?: string | null };
  }[];
  status: string;
  internshipType?: string | null;
  academicYear: string;
  startDate?: string;
  endDate?: string;
  _count: { documents: number; messages: number };
  createdAt: string;
}

const INTERNSHIP_LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;

// Statuses where an internship is genuinely under way (started, not finished
// or cancelled). Only these are flagged for missing end date / final report —
// REQUESTED/DOCUMENT_SENT/CANCELLED/COMPLETED are excluded to avoid noise.
const ACTIVE_STATUSES = [
  "IN_PROGRESS",
  "NEEDS_REVISION",
  "APPROVED",
  "FINAL_REPORT_SUBMITTED",
  "PENDING_ADMIN_CONFIRMATION",
];
// Statuses that imply the final report has been submitted.
const REPORT_SUBMITTED_STATUSES = [
  "FINAL_REPORT_SUBMITTED",
  "PENDING_ADMIN_CONFIRMATION",
  "COMPLETED",
];

function internshipAttention(i: { status: string; endDate?: string }) {
  const active = ACTIVE_STATUSES.includes(i.status);
  const noEndDate = active && !i.endDate;
  const noReport = active && !REPORT_SUBMITTED_STATUSES.includes(i.status);
  return { noEndDate, noReport, flagged: noEndDate || noReport };
}

export default function AdminInternshipsPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  // Department admins are already scoped server-side to their own department
  // (by the internship's topic filière), so the department filter is
  // meaningless for them — only super admins choose a department.
  const isSuperAdmin = !!session?.user?.isSuperAdmin;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [filiereFilter, setFiliereFilter] = useState("ALL");
  const [levelFilter, setLevelFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [attentionFilter, setAttentionFilter] = useState("ALL");
  const [filieres, setFilieres] = useState<any[]>([]);

  const fetchFilieres = async () => {
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      setFilieres(data.data || []);
    } catch (error) {
      console.error("Failed to load filieres");
    }
  };

  const internshipsKey = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.append("status", statusFilter);
    if (filiereFilter !== "ALL") params.append("filiereId", filiereFilter);
    if (levelFilter !== "ALL") params.append("level", levelFilter);
    if (typeFilter !== "ALL") params.append("internshipType", typeFilter);
    return `/api/internships?${params.toString()}`;
  }, [statusFilter, filiereFilter, levelFilter, typeFilter]);

  const { data: internshipsResp, isLoading } = useApi<{ data: Internship[] }>(
    internshipsKey,
    { domains: "internships" },
  );
  const internships: Internship[] = internshipsResp?.data || [];

  useEffect(() => {
    if (isSuperAdmin) fetchFilieres();
  }, [isSuperAdmin]);

  const filteredInternships = internships.filter(i => {
    const matchesSearch = i.topic.title.toLowerCase().includes(search.toLowerCase()) || 
                         i.students.some(s => s.student.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || i.status === statusFilter;
    const matchesAttention =
      attentionFilter === "ALL" || internshipAttention(i).flagged;
    return matchesSearch && matchesStatus && matchesAttention;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("common.internships")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("common.appSubtitle")}</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("common.search")}
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isSuperAdmin && (
            <select
              className="admin-input min-w-0 sm:min-w-[180px] w-full sm:w-auto"
              value={filiereFilter}
              onChange={(e) => setFiliereFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <select
            className="admin-input min-w-0 sm:min-w-[200px] w-full sm:w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">{t("common.all")}</option>
            <option value="REQUESTED">{t("status.REQUESTED")}</option>
            <option value="DOCUMENT_SENT">{t("status.DOCUMENT_SENT")}</option>
            <option value="IN_PROGRESS">{t("status.IN_PROGRESS")}</option>
            <option value="NEEDS_REVISION">{t("status.NEEDS_REVISION")}</option>
            <option value="FINAL_REPORT_SUBMITTED">{t("status.FINAL_REPORT_SUBMITTED")}</option>
            <option value="PENDING_ADMIN_CONFIRMATION">{t("status.PENDING_ADMIN_CONFIRMATION")}</option>
            <option value="COMPLETED">{t("status.COMPLETED")}</option>
            <option value="CANCELLED">{t("status.CANCELLED")}</option>
          </select>
          <select
            className="admin-input min-w-0 sm:min-w-[140px] w-full sm:w-auto"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            title="Filter by internship type"
          >
            <option value="ALL">Type: All</option>
            <option value="PFE">PFE</option>
            <option value="NORMAL">Normal</option>
          </select>
          <select
            className="admin-input min-w-0 sm:min-w-[170px] w-full sm:w-auto"
            value={attentionFilter}
            onChange={(e) => setAttentionFilter(e.target.value)}
            title="Flag internships missing an end date or final report"
          >
            <option value="ALL">Attention: All</option>
            <option value="ATTENTION">Needs attention</option>
          </select>
          <select
            className="admin-input min-w-0 sm:min-w-[120px] w-full sm:w-auto"
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            title="Filter by student level"
          >
            <option value="ALL">Level: All</option>
            {INTERNSHIP_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>{lvl}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Internships List */}
      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("common.users")} & {t("topics.title")}</th>
              <th>{t("dashboard.supervisor")}</th>
              <th>{t("common.milestones")}</th>
              <th>{t("common.status")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-12 text-gray-400">{t("common.loading")}</td>
              </tr>
            ) : filteredInternships.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-12 text-gray-400">{t("common.noData")}</td>
              </tr>
            ) : (
              filteredInternships.map((internship) => (
                <tr key={internship.id} className="admin-table-row">
                  <td data-label="Internship" className="py-4">
                    <div className="flex flex-col max-w-[420px] items-start">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {internship.students.map((s) => (
                          <span
                            key={s.student.email}
                            className="inline-flex items-center gap-1 text-[12px] font-semibold text-gray-900 dark:text-white"
                          >
                            {s.student.name}
                            {s.student.level && (
                              <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded">
                                {s.student.level}
                              </span>
                            )}
                            {s.isLeader && (
                              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded uppercase">
                                Leader
                              </span>
                            )}
                          </span>
                        ))}
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">
                          ({internship.students.length === 1 ? "Solo" : `${internship.students.length}-person team`})
                        </span>
                      </div>
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className="text-[12px] text-indigo-600 dark:text-indigo-400 font-medium line-clamp-2 text-left">
                          {internship.topic.title}
                        </span>
                        <InternshipTypeBadge
                          type={internship.internshipType ?? internship.topic.internshipType}
                        />
                      </span>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400 dark:text-gray-500">
                        {internship.topic.filiere?.name && (
                          <span className="font-semibold uppercase tracking-tight">{internship.topic.filiere.name}</span>
                        )}
                        {internship.topic.targetLevels && (
                          <>
                            <span>·</span>
                            <span>Target: {internship.topic.targetLevels}</span>
                          </>
                        )}
                      </div>
                      {internship.startDate && internship.endDate && (
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {format(new Date(internship.startDate), "MMM d")} - {format(new Date(internship.endDate), "MMM d, yyyy")}
                        </div>
                      )}
                    </div>
                  </td>
                  <td data-label="Supervisor">
                    <div className="flex flex-col items-start gap-0.5">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                        <span className="text-[13px] text-gray-900 dark:text-white font-medium">{internship.teacher.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1.5 py-0.5 font-semibold bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700 uppercase tracking-tight ml-6">
                        {internship.teacher.filiereName || "ESST"}
                      </span>
                    </div>
                  </td>
                  <td data-label="Progress">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5" title="Documents uploaded">
                        <FileText className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">{internship._count.documents} docs</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Messages exchanged">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-[12px] font-medium text-gray-600 dark:text-gray-400">{internship._count.messages} msg</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <div className="flex flex-col items-start gap-1">
                      <StatusBadge status={internship.status} />
                      {(() => {
                        const a = internshipAttention(internship);
                        if (!a.flagged) return null;
                        const parts = [
                          a.noEndDate ? "no end date" : null,
                          a.noReport ? "no final report" : null,
                        ].filter(Boolean);
                        return (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded"
                            title={`This active internship has ${parts.join(" & ")}.`}
                          >
                            <XCircle className="h-3 w-3" />
                            {parts.join(" · ")}
                          </span>
                        );
                      })()}
                    </div>
                  </td>
                  <td data-label="View" className="text-right">
                    <Link href={`/admin/internships/${internship.id}`} className="inline-flex p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


