"use client";

import React, { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils/formatDate";
import { History, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function AdminAuditPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/audit");
        const data = await res.json();
        setLogs(data.data || []);
      } catch (error) {
        toast.error("Failed to load audit logs");
      } finally {
        setIsLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("nav.audit")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("common.appSubtitle")}</p>
        </div>
      </div>

      <div className="admin-table-container">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-gray-500" />
              <input 
                placeholder="Search logs..." 
                className="admin-input pl-10 w-[300px]"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white rounded border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <Filter className="h-4 w-4" />
            </button>
          </div>
        </div>

        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row"><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">{t("common.loading")}</td></tr>
            ) : logs.length === 0 ? (
              <tr className="empty-row"><td colSpan={5} className="text-center py-8 text-gray-400 dark:text-gray-500">{t("common.noData")}</td></tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id} className="admin-table-row">
                  <td className="font-mono text-[11px] text-gray-400 dark:text-gray-500">{formatDateTime(log.createdAt)}</td>
                  <td>
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white">{log.user.name}</span>
                  </td>
                  <td>
                    <span className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-800 text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase">
                      {log.action}
                    </span>
                  </td>
                  <td>
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{log.targetType} ({log.targetId.substring(0, 8)}...)</span>
                  </td>
                  <td className="max-w-[300px] truncate text-[11px] text-gray-400 dark:text-gray-500">
                    {log.details ? JSON.stringify(log.details) : "—"}
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
