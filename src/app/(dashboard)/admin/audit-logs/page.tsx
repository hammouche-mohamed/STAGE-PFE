"use client";

import React, { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Search, 
  Download, 
  Calendar, 
  User, 
  Activity,
  Trash2,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function AuditLogsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  if (session && !session.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 shadow-sm">
        <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Only Administrators can view system audit logs. Please contact the main administrator if you believe this is an error.
        </p>
      </div>
    );
  }
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchLogs = async (currentPage = page, currentSearch = search, silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const res = await fetch(`/api/audit?page=${currentPage}&search=${encodeURIComponent(currentSearch)}`);
      const data = await res.json();
      setLogs(data.data || []);
      if (data.pagination) {
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      }
    } catch (error) {
      if (!silent) toast.error("Failed to load audit logs");
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLogs(1, search);
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLogs(page, search);

    // Auto-poll every 30 seconds for real-time updates
    const pollId = setInterval(() => fetchLogs(page, search, true), 30000);
    return () => clearInterval(pollId);
  }, [page]);

  const filteredLogs = logs; // Now handled server-side

  const downloadCSV = () => {
    if (logs.length === 0) return;

    const headers = ["Date", "User", "Action", "Target Type", "Target Name/ID", "Details", "IP Address"];
    const csvContent = [
      headers.join(","),
      ...logs.map(log => {
        const details = log.details ? log.details.replace(/,/g, ";").replace(/\n/g, " ") : "";
        return [
          format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
          `"${log.user.name} (${log.user.email})"`,
          `"${log.action}"`,
          `"${log.targetType}"`,
          `"${log.targetId}"`,
          `"${details}"`,
          `"${log.ipAddress || "N/A"}"`
        ].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit_report_${format(new Date(), "yyyy_MM_dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Audit report downloaded successfully");
  };

  const handleManualCleanup = async () => {
    if (!confirm("Are you sure? This will permanently delete logs older than 1 year. You should download the CSV first.")) return;
    
    setIsCleaning(true);
    try {
      const res = await fetch("/api/audit/cleanup", { method: "POST" });
      const result = await res.json();
      if (res.ok) {
        toast.success(`Cleanup complete: Removed ${result.deletedCount} old entries.`);
        fetchLogs();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cleanup failed");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900 dark:text-white flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            System Audit logs
          </h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("nav.audit")}</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadCSV}
            className="flex-1 sm:flex-none"
            disabled={isLoading || logs.length === 0}
          >
            <Download className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-[11px] md:text-[13px]">{t("common.export")}</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("admin.users.searchPlaceholder")}
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
           <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
           {t("common.loading") === "Loading..." ? "Refresh" : "Actualiser"}
        </Button>
      </div>

      <div className="admin-table-container sm:bg-white dark:sm:bg-slate-900 sm:border sm:border-gray-200 dark:sm:border-slate-800 sm:rounded-md">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>Timestamp</th>
              <th>Administrator</th>
              <th>Action</th>
              <th>Target</th>
              <th>Entity Type</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 italic">{t("common.loading")}</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">{t("common.noData")}</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="admin-table-row">
                  <td data-label="Time" className="whitespace-nowrap py-3 sm:py-0">
                    <div className="flex items-center text-gray-500 dark:text-gray-400 text-[11px] sm:text-[12px]">
                      <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      {format(new Date(log.createdAt), "MMM d, HH:mm")}
                    </div>
                  </td>
                  <td data-label="Admin">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex-shrink-0">
                        {log.user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0 items-start">
                        <span className="text-[12px] sm:text-[13px] font-medium text-gray-900 dark:text-white truncate">{log.user.name}</span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{log.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Action">
                    <span className="text-[10px] sm:text-[12px] font-bold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700 italic whitespace-nowrap">
                       {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td data-label="Target">
                    <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                      {log.targetId}
                    </span>
                  </td>
                  <td data-label="Type">
                    <div className="flex items-center text-[12px] text-gray-500 dark:text-gray-400">
                      <Activity className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                      {log.targetType}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-sm mt-4">
          <div className="text-[12px] text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-900 dark:text-white">{logs.length}</span> of <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> results
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || isLoading}
            >
              Previous
            </Button>
            <div className="flex items-center px-4 text-[12px] font-medium text-gray-700 dark:text-gray-300">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || isLoading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 p-4 rounded-lg flex items-start gap-3">
         <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded text-blue-700 dark:text-blue-300">
            <RefreshCw className="h-4 w-4" />
         </div>
         <div className="text-[13px] text-blue-800 dark:text-blue-300 leading-relaxed">
            <strong>System Maintenance:</strong> Automatic log rotation is enabled. Logs older than 365 days are automatically pruned to maintain system performance. Always download a CSV report before performing manual cleanup.
         </div>
      </div>
    </div>
  );
}
