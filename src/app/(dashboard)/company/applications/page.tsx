"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Filter,
  User
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
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

export default function CompanyApplicationsPage() {
  const { t, isRTL } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  const fetchApplications = async () => {
    try {
      const res = await fetch("/api/applications");
      const data = await res.json();
      setApplications(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadApplicationsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleAction = async (id: string, status: "ACCEPTED" | "REJECTED") => {
    setIsProcessing(id);
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update");
      toast.success(data.message);
      fetchApplications();
    } catch (error: any) {
      toast.error(error.message || t("toast.actionFailed"));
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("nav.applications")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("topics.pendingApproval")}</p>
        </div>
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
            ) : applications.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">{t("common.noData")}</td></tr>
            ) : (
              applications.map((app) => (
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
                          <button 
                            onClick={() => handleAction(app.id, "ACCEPTED")}
                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                            title="Accept"
                            disabled={isProcessing === app.id}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleAction(app.id, "REJECTED")}
                            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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

