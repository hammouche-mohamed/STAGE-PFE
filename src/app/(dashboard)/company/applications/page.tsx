"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Eye,
  User
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Application {
  id: string;
  topicId: string;
  topic: { title: string };
  status: string;
  appliedAt: string;
  message?: string | null;
  team?: {
    members: Array<{ student: { name: string; email: string } }>;
  };
}

type StatusFilter = "ALL" | "PENDING" | "ACCEPTED" | "REJECTED";

export default function CompanyApplicationsPage() {
  const { t } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [confirmAction, setConfirmAction] = useState<{
    app: Application;
    status: "ACCEPTED" | "REJECTED";
  } | null>(null);
  // When opened from a topic's "View Applications", scope to that topic only.
  const [topicFilterId, setTopicFilterId] = useState<string | null>(null);
  const [topicFilterTitle, setTopicFilterTitle] = useState<string | null>(null);

  const fetchApplications = async (topicId?: string | null) => {
    try {
      const url = topicId
        ? `/api/applications?topicId=${encodeURIComponent(topicId)}`
        : "/api/applications";
      const res = await fetch(url);
      const data = await res.json();
      const list = data.data || [];
      setApplications(list);
      if (topicId && list[0]?.topic?.title) setTopicFilterTitle(list[0].topic.title);
    } catch (error) {
      toast.error(t("toast.loadApplicationsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const tid =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("topicId")
        : null;
    setTopicFilterId(tid);
    fetchApplications(tid);
  }, []);

  const clearTopicFilter = () => {
    setTopicFilterId(null);
    setTopicFilterTitle(null);
    window.history.replaceState({}, "", "/company/applications");
    setIsLoading(true);
    fetchApplications(null);
  };

  const counts = useMemo(() => {
    const c = { ALL: applications.length, PENDING: 0, ACCEPTED: 0, REJECTED: 0 };
    for (const a of applications) {
      if (a.status === "PENDING") c.PENDING++;
      else if (a.status === "ACCEPTED") c.ACCEPTED++;
      else if (a.status === "REJECTED") c.REJECTED++;
    }
    return c;
  }, [applications]);

  const filteredApplications = useMemo(
    () =>
      statusFilter === "ALL"
        ? applications
        : applications.filter((a) => a.status === statusFilter),
    [applications, statusFilter]
  );

  const performAction = async (app: Application, status: "ACCEPTED" | "REJECTED") => {
    const prevStatus = app.status;
    setConfirmAction(null);
    setIsProcessing(app.id);
    // Optimistic update — reflect the decision immediately.
    setApplications((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status } : a))
    );
    try {
      const res = await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(data.message);
    } catch (error: any) {
      // Revert on failure.
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: prevStatus } : a))
      );
      toast.error(error.message || t("toast.actionFailed"));
    } finally {
      setIsProcessing(null);
    }
  };

  const filterTabs: { key: StatusFilter; label: string }[] = [
    { key: "ALL", label: t("common.all") },
    { key: "PENDING", label: t("status.PENDING") },
    { key: "ACCEPTED", label: t("status.ACCEPTED") },
    { key: "REJECTED", label: t("status.REJECTED") },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("nav.applications")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("topics.pendingApproval")}</p>
        </div>
      </div>

      {topicFilterId && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-900/15 px-4 py-2.5">
          <p className="text-[12px] text-indigo-700 dark:text-indigo-300">
            <span className="font-semibold">{t("company.msg.appsFilteredBy")}:</span>{" "}
            {topicFilterTitle ?? "…"}
          </p>
          <button
            onClick={clearTopicFilter}
            className="text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
          >
            {t("company.msg.appsShowAll")}
          </button>
        </div>
      )}

      {/* Status filter */}
      <div className="flex flex-wrap items-center gap-2">
        {filterTabs.map((tab) => {
          const active = statusFilter === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700"
              }`}
            >
              {tab.label}
              <span
                className={`rounded-full px-1.5 text-[11px] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-white dark:bg-slate-900 text-gray-500 dark:text-gray-400"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("common.topics")}</th>
              <th>{t("common.date")}</th>
              <th>{t("common.status")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">{t("common.loading")}</td></tr>
            ) : filteredApplications.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">{t("common.noData")}</td></tr>
            ) : (
              filteredApplications.map((app) => (
                <tr key={app.id} className="admin-table-row">
                  <td data-label="Group">
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                       <User className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                       <span className="font-medium text-gray-900 dark:text-white">Group {app.id.slice(-4)}</span>
                    </div>
                  </td>
                  <td data-label="Topic">
                    <span className="text-[13px] text-indigo-600 font-medium text-right sm:text-left sm:max-w-[250px] sm:truncate block">
                      {app.topic.title}
                    </span>
                  </td>
                  <td data-label="Date">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{format(new Date(app.appliedAt), "MMM d, yyyy")}</span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={app.status} />
                  </td>
                  <td data-label="Review" className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {app.status === "PENDING" && (
                        <>
                          <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-slate-700" aria-hidden="true" />
                          <button
                            onClick={() => setConfirmAction({ app, status: "ACCEPTED" })}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded disabled:opacity-40"
                            title="Accept"
                            disabled={isProcessing === app.id}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setConfirmAction({ app, status: "REJECTED" })}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded disabled:opacity-40"
                            title="Reject"
                            disabled={isProcessing === app.id}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Accept / Reject confirmation */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={
          confirmAction?.status === "ACCEPTED"
            ? t("company.msg.confirmAcceptTitle")
            : t("company.msg.confirmRejectTitle")
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant={confirmAction?.status === "ACCEPTED" ? "primary" : "danger"}
              onClick={() =>
                confirmAction && performAction(confirmAction.app, confirmAction.status)
              }
            >
              {confirmAction?.status === "ACCEPTED"
                ? t("company.msg.confirmAcceptCta")
                : t("company.msg.confirmRejectCta")}
            </Button>
          </>
        }
      >
        {confirmAction && (
          <p className="text-[13px] text-gray-600 dark:text-gray-300 leading-relaxed">
            {confirmAction.status === "ACCEPTED"
              ? t("company.msg.confirmAcceptBody", {
                  group: `Group ${confirmAction.app.id.slice(-4)}`,
                  topic: confirmAction.app.topic.title,
                })
              : t("company.msg.confirmRejectBody", {
                  group: `Group ${confirmAction.app.id.slice(-4)}`,
                  topic: confirmAction.app.topic.title,
                })}
          </p>
        )}
      </Modal>

      {/* Application Details Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-slate-800">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
              <h3 className="font-semibold text-gray-900 dark:text-white">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-500">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">Topic</p>
                <p className="text-[14px] font-medium text-gray-900 dark:text-gray-100">{selectedApp.topic.title}</p>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Team Members</p>
                <div className="flex flex-col gap-2">
                  {selectedApp.team?.members.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 dark:bg-slate-800 p-2 rounded-md">
                      <User className="h-4 w-4 text-indigo-500" />
                      <span className="text-[13px] text-gray-700 dark:text-gray-300 font-medium">{m.student.name}</span>
                      <span className="text-[12px] text-gray-500">({m.student.email})</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Motivation Letter</p>
                <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                  {selectedApp.message ? (
                    <p className="text-[13px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                      {selectedApp.message}
                    </p>
                  ) : (
                    <p className="text-[13px] text-gray-400 italic">No motivation letter provided.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => setSelectedApp(null)}
                className="px-4 py-2 text-[13px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
