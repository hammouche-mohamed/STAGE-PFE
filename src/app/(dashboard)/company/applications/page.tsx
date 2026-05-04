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
  topic: { title: string };
  status: string;
  appliedAt: string;
  leaderId: string;
  partnerId?: string | null;
}

export default function CompanyApplicationsPage() {
  const { t, isRTL } = useTranslation();
  const [applications, setApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
    try {
      // In a real app we'd have a specific patch route for applications
      toast.info(`Application ${status.toLowerCase()} (Ready for next step)`);
    } catch (error) {
      toast.error(t("toast.actionFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("nav.applications")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("topics.pendingApproval")}</p>
        </div>
      </div>

      <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
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
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t("common.loading")}</td></tr>
            ) : applications.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400">{t("common.noData")}</td></tr>
            ) : (
              applications.map((app) => (
                <tr key={app.id} className="admin-table-row">
                  <td data-label="Group">
                    <div className="flex items-center gap-2 justify-end sm:justify-start">
                       <User className="h-4 w-4 text-gray-400" />
                       <span className="font-medium text-gray-900">Group {app.id.slice(-4)}</span>
                    </div>
                  </td>
                  <td data-label="Topic">
                    <span className="text-[13px] text-indigo-600 font-medium text-right sm:text-left sm:max-w-[250px] sm:truncate block">
                      {app.topic.title}
                    </span>
                  </td>
                  <td data-label="Date">
                    <span className="text-[12px] text-gray-500">{format(new Date(app.appliedAt), "MMM d, yyyy")}</span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={app.status} />
                  </td>
                  <td data-label="Review" className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => handleAction(app.id, "ACCEPTED")}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                        title="Accept"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleAction(app.id, "REJECTED")}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
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

