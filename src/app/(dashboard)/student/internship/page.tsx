"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { 
  Briefcase, 
  Calendar, 
  FileText, 
  MessageSquare,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Upload,
  ChevronRight
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format, differenceInDays, isPast } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Internship {
  id: string;
  topic: { title: string; type: string; description: string; companyName?: string };
  teacher: { name: string; email: string };
  status: string;
  academicYear: string;
  internshipType?: string | null;
  startDate?: string;
  endDate?: string;
  midtermDeadline?: string | null;
  finalDeadline?: string | null;
  technicalSupervisorName?: string;
  technicalSupervisorEmail?: string;
}

interface Document {
  id: string;
  type: string;
  fileName: string;
  status: string;
  uploadedAt: string;
  version: number;
}

type ReportStatus = "SUBMITTED" | "SUBMITTED_LATE" | "MISSING_OVERDUE" | "PENDING" | "NOT_REQUIRED";

function getReportStatus(deadline: string | null | undefined, docs: Document[], type: string): ReportStatus {
  const submitted = docs.find((d) => d.type === type);
  if (!deadline) return "NOT_REQUIRED";
  const dl = new Date(deadline);
  if (submitted) {
    const submittedDate = new Date(submitted.uploadedAt);
    return submittedDate <= dl ? "SUBMITTED" : "SUBMITTED_LATE";
  }
  return isPast(dl) ? "MISSING_OVERDUE" : "PENDING";
}

function ReportRow({ label, deadline, status, uploadLink, daysLeft, labels }: {
  label: string;
  deadline?: string | null;
  status: ReportStatus;
  uploadLink: string;
  daysLeft?: number | null;
  labels: {
    submittedOnTime: string;
    submittedLate: string;
    missingOverdue: string;
    daysRemaining: string;
    daysRemainingPlural: string;
    upcoming: string;
    upload: string;
  };
}) {
  if (status === "NOT_REQUIRED") return null;

  const pendingText = daysLeft != null
    ? (daysLeft === 1
        ? labels.daysRemaining.replace("{days}", "1")
        : labels.daysRemainingPlural.replace("{days}", String(daysLeft)))
    : labels.upcoming;

  const config = {
    SUBMITTED: { icon: <CheckCircle2 className="h-5 w-5 text-green-600" />, badge: "bg-green-50 text-green-700 border-green-200", text: labels.submittedOnTime, border: "border-green-200" },
    SUBMITTED_LATE: { icon: <CheckCircle2 className="h-5 w-5 text-amber-500" />, badge: "bg-amber-50 text-amber-700 border-amber-200", text: labels.submittedLate, border: "border-amber-200" },
    MISSING_OVERDUE: { icon: <XCircle className="h-5 w-5 text-red-600" />, badge: "bg-red-50 text-red-700 border-red-200", text: labels.missingOverdue, border: "border-red-300" },
    PENDING: { icon: <Clock className="h-5 w-5 text-indigo-500" />, badge: "bg-indigo-50 text-indigo-700 border-indigo-200", text: pendingText, border: "border-indigo-200" },
  }[status];

  return (
    <div className={`flex items-center justify-between p-4 rounded-lg border ${config.border} bg-white dark:bg-slate-900`}>
      <div className="report-row-inner flex items-center gap-3 flex-1">
        {config.icon}
        <div>
          <p className="text-[13px] font-bold text-gray-900 dark:text-white">{label}</p>
          {deadline && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {format(new Date(deadline), "PPP")}
            </p>
          )}
          <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${config.badge}`}>
            {config.text}
          </span>
        </div>
      </div>
      {(status === "PENDING" || status === "MISSING_OVERDUE") && (
        <Link
          href={uploadLink}
          className="report-upload-btn flex items-center gap-1.5 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Upload className="h-3.5 w-3.5" />
          {labels.upload}
          <ChevronRight className="h-3 w-3" />
        </Link>
      )}
    </div>
  );
}

export default function StudentInternshipPage() {
  const { t } = useTranslation();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      const active: Internship = data.data?.[0] || null;
      setInternship(active);

      if (active) {
        const docRes = await fetch(`/api/documents?internshipId=${active.id}`);
        const docData = await docRes.json();
        setDocuments(docData.data || []);
      }
    } catch {
      toast.error(t("toast.loadInternshipFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (isLoading) return <div className="text-center py-12 text-gray-400">{t("common.loading")}</div>;

  if (!internship) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="h-16 w-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-gray-400 dark:text-gray-500">
          <Briefcase className="h-8 w-8" />
        </div>
        <h2 className="text-[18px] font-bold text-gray-900 dark:text-white">{t("internship.noInternship")}</h2>
        <p className="text-gray-500 dark:text-gray-400 text-[14px]">{t("dashboard.browseTopics")}</p>
        <div className="pt-4">
          <a href="/student/topics" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-[13px] font-medium hover:bg-indigo-700 transition-colors">
            {t("topics.title")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </a>
        </div>
      </div>
    );
  }

  const isPFE = internship.internshipType === "PFE";
  const midStatus = getReportStatus(internship.midtermDeadline, documents, "MID_REPORT");
  const finalStatus = getReportStatus(internship.finalDeadline, documents, "FINAL_REPORT");

  const midDaysLeft = internship.midtermDeadline && !isPast(new Date(internship.midtermDeadline))
    ? differenceInDays(new Date(internship.midtermDeadline), new Date()) : null;
  const finalDaysLeft = internship.finalDeadline && !isPast(new Date(internship.finalDeadline))
    ? differenceInDays(new Date(internship.finalDeadline), new Date()) : null;

  const hasOverdue = midStatus === "MISSING_OVERDUE" || finalStatus === "MISSING_OVERDUE";
  const hasUrgent = (midDaysLeft != null && midDaysLeft <= 7) || (finalDaysLeft != null && finalDaysLeft <= 7);
  const uploadUrl = `/student/documents?internshipId=${internship.id}`;

  const panelLabels = {
    submittedOnTime: t("internship.reportPanel.submittedOnTime"),
    submittedLate: t("internship.reportPanel.submittedLate"),
    missingOverdue: t("internship.reportPanel.missingOverdue"),
    daysRemaining: t("internship.reportPanel.daysRemaining"),
    daysRemainingPlural: t("internship.reportPanel.daysRemainingPlural"),
    upcoming: t("internship.reportPanel.upcoming"),
    upload: t("internship.reportPanel.upload"),
  };

  const docCountText = documents.length === 1
    ? t("internship.reportPanel.uploadedTotal").replace("{count}", "1")
    : t("internship.reportPanel.uploadedTotalPlural").replace("{count}", String(documents.length));

  return (
    <div className="space-y-6">
      {/* Overdue Banner */}
      {hasOverdue && (
        <div className="alert-banner flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
          <p className="text-[13px] font-semibold text-red-800 dark:text-red-300">
            {t("internship.reportPanel.overdueAlert")}
          </p>
        </div>
      )}
      {!hasOverdue && hasUrgent && (
        <div className="alert-banner flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-4">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-[13px] font-semibold text-amber-800 dark:text-amber-300">
            {t("internship.reportPanel.urgentAlert")}
          </p>
        </div>
      )}

      {/* Header */}
      <div className="internship-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="internship-header-badges flex items-center gap-2 mb-1">
            <StatusBadge status={internship.status} />
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{internship.academicYear}</span>
            {internship.internshipType && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${isPFE ? "bg-purple-50 text-purple-700 border border-purple-200" : "bg-blue-50 text-blue-700 border border-blue-200"}`}>
                {internship.internshipType}
              </span>
            )}
          </div>
          <h1 className="text-[20px] font-bold text-gray-900 dark:text-white">{internship.topic.title}</h1>
          {internship.startDate && internship.endDate && (
            <div className="internship-date-range flex items-center gap-4 mt-2 text-[12px] text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {format(new Date(internship.startDate), "PPP")} — {format(new Date(internship.endDate), "PPP")}
              </span>
            </div>
          )}
        </div>
        <Link
          href={`/student/messages?id=${internship.id}`}
          className="px-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md text-[13px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 flex items-center shadow-sm transition-all w-fit"
        >
          <MessageSquare className="h-4 w-4 mr-2 text-indigo-500 dark:text-indigo-400" />
          {t("nav.messages")}
        </Link>
      </div>

      <div className="internship-layout grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-500" />
              {t("internship.reportPanel.topicDescription")}
            </h2>
            <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed">
              {internship.topic.description}
            </p>
          </div>

          {/* Report Submission Status */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-500" />
                {t("internship.reportPanel.title")}
              </h2>
              <Link
                href={uploadUrl}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide hover:underline flex items-center gap-1"
              >
                {t("internship.reportPanel.viewAll")} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {!internship.midtermDeadline && !internship.finalDeadline ? (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-[13px]">{t("internship.reportPanel.noDeadlines")}</p>
                <p className="text-[12px] mt-1">{t("internship.reportPanel.noDeadlinesDesc")}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {isPFE && (
                  <ReportRow
                    label={t("internship.reportPanel.midTermLabel")}
                    deadline={internship.midtermDeadline}
                    status={midStatus}
                    uploadLink={uploadUrl}
                    daysLeft={midDaysLeft}
                    labels={panelLabels}
                  />
                )}
                <ReportRow
                  label={isPFE ? t("internship.reportPanel.finalLabelPFE") : t("internship.reportPanel.finalLabelNormal")}
                  deadline={internship.finalDeadline}
                  status={finalStatus}
                  uploadLink={uploadUrl}
                  daysLeft={finalDaysLeft}
                  labels={panelLabels}
                />
                <div className="pt-3 border-t border-gray-100 dark:border-slate-800 flex items-center gap-4 text-[12px] text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    {docCountText}
                  </span>
                  <Link href={uploadUrl} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                    {t("internship.reportPanel.manage")} →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="internship-sidebar-card bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm space-y-6">
            <div>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                {t("internship.reportPanel.academicSupervisor")}
              </p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-[14px]">
                  {internship.teacher.name.charAt(0)}
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white">{internship.teacher.name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{internship.teacher.email}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-50 dark:border-slate-800">
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                {t("internship.reportPanel.companyDetails")}
              </p>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white truncate">{internship.topic.companyName || t("internship.company")}</p>
                  {internship.technicalSupervisorName && (
                    <div className="mt-2 pt-2 border-t border-gray-50 dark:border-slate-800">
                      <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tight">
                        {t("internship.reportPanel.technicalSupervisor")}
                      </p>
                      <p className="text-[12px] text-gray-700 dark:text-gray-300 font-medium">{internship.technicalSupervisorName}</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">{internship.technicalSupervisorEmail}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Key Deadlines */}
            {(internship.midtermDeadline || internship.finalDeadline) && (
              <div className="pt-6 border-t border-gray-50 dark:border-slate-800">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                  {t("internship.reportPanel.keyDeadlines")}
                </p>
                <div className="space-y-2">
                  {isPFE && internship.midtermDeadline && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-600 dark:text-gray-400">{t("internship.reportPanel.midTermReport")}</span>
                      <span className={`font-bold ${midStatus === "MISSING_OVERDUE" ? "text-red-600" : midStatus === "SUBMITTED" || midStatus === "SUBMITTED_LATE" ? "text-green-600" : "text-gray-900 dark:text-white"}`}>
                        {format(new Date(internship.midtermDeadline), "MMM d")}
                      </span>
                    </div>
                  )}
                  {internship.finalDeadline && (
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-600 dark:text-gray-400">{t("internship.reportPanel.finalReport")}</span>
                      <span className={`font-bold ${finalStatus === "MISSING_OVERDUE" ? "text-red-600" : finalStatus === "SUBMITTED" || finalStatus === "SUBMITTED_LATE" ? "text-green-600" : "text-indigo-700 dark:text-indigo-400"}`}>
                        {format(new Date(internship.finalDeadline), "MMM d")}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Document Library CTA */}
          <div className="doc-library-cta bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md p-5 text-gray-900 dark:text-white shadow-sm dark:shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400 mb-4" />
              <h3 className="text-[15px] font-bold">{t("internship.reportPanel.documentLibrary")}</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                {t("internship.reportPanel.documentLibraryDesc")}
              </p>
              <Link href={uploadUrl} className="mt-4 inline-flex items-center text-[12px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide hover:underline">
                {t("internship.reportPanel.manageDocuments")}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </div>
            <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
