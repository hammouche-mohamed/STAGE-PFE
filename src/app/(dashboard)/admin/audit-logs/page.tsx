"use client";

import React, { useEffect, useState } from "react";
import { 
  ClipboardList, 
  Search, 
  Download, 
  Calendar, 
  User, 
  Activity,
  RefreshCw,
  ShieldCheck,
  Eye,
  Info,
  ChevronRight
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
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
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Authentication check
  if (session && !session.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-dashed border-gray-300 dark:border-slate-700 shadow-sm">
        <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Access Restricted</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Only Super Administrators can view system audit logs.
        </p>
      </div>
    );
  }

  const parseDetails = (details: string | null) => {
    if (!details) return null;
    try {
      return JSON.parse(details);
    } catch {
      return details;
    }
  };

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
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchLogs(page, search);
    const pollId = setInterval(() => fetchLogs(page, search, true), 30000);
    return () => clearInterval(pollId);
  }, [page]);

  const downloadCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Date", "User", "Action", "Target", "Type", "Details", "IP"];
    const csvContent = [
      headers.join(","),
      ...logs.map(log => [
        format(new Date(log.createdAt), "yyyy-MM-dd HH:mm"),
        `"${log.user.name}"`,
        `"${log.action}"`,
        `"${log.targetId}"`,
        `"${log.targetType}"`,
        `"${log.details?.replace(/"/g, '""') || ""}"`,
        `"${log.ipAddress || ""}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${format(new Date(), "yyyy_MM_dd")}.csv`;
    link.click();
    toast.success("Logs exported to CSV");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            System Audit logs
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("nav.audit")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadCSV} disabled={logs.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          {t("common.export")}
        </Button>
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
        <Button variant="outline" size="sm" onClick={() => fetchLogs()}>
           <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
           Refresh
        </Button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Timestamp</th>
              <th>Administrator</th>
              <th>Action</th>
              <th>Target</th>
              <th>Type</th>
              <th className="text-right px-6">Details</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 italic">Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No logs found</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="admin-table-row">
                  <td className="whitespace-nowrap text-[12px] text-gray-500">
                    {format(new Date(log.createdAt), "MMM d, HH:mm")}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                        {log.user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[13px] font-medium text-gray-900 dark:text-white">{log.user.name}</span>
                        <span className="text-[10px] text-gray-500">{log.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="text-[11px] font-bold bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic">
                       {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="text-[13px] text-gray-900 dark:text-white">{log.targetId}</td>
                  <td className="text-[12px] text-gray-500">{log.targetType}</td>
                  <td className="text-right px-6">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setSelectedLog(log)}>
                      <Eye className="h-4 w-4 text-indigo-600" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-4 bg-white dark:bg-slate-900 border rounded-lg shadow-sm">
          <div className="text-[12px] text-gray-500">
            Showing {logs.length} of {totalItems} results
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
            <span className="flex items-center px-4 text-[12px]">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Audit Log Details" size="lg">
        {selectedLog && (() => {
          const details = parseDetails(selectedLog.details);
          return (
            <div className="space-y-6 py-2">
              <div className="grid grid-cols-2 gap-6 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Action Type</span>
                  <div className="text-[14px] font-semibold text-gray-900 dark:text-white">{selectedLog.action.replace(/_/g, " ")}</div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Date</span>
                  <div className="text-[13px] font-medium">{format(new Date(selectedLog.createdAt), "PPP p")}</div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-[13px] font-bold flex items-center gap-2"><User className="h-4 w-4" /> Performed By</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center font-bold text-indigo-600">{selectedLog.user.name.charAt(0)}</div>
                    <div>
                      <div className="text-[13px] font-medium">{selectedLog.user.name}</div>
                      <div className="text-[11px] text-gray-500">{selectedLog.user.email}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-400">Source: {selectedLog.ipAddress || "Internal"}</div>
                </div>
              </div>

              {details?.modifications?.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-[13px] font-bold flex items-center gap-2 text-blue-600"><RefreshCw className="h-4 w-4" /> Changes Applied</h3>
                  <div className="bg-blue-50/30 border border-blue-100 rounded-xl p-4 space-y-2">
                    {details.modifications.map((mod: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-[13px] text-gray-700">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-blue-400 shrink-0" />
                        <span>{mod.replace(/^• /, "")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {details?.before && details?.after && (
                <div className="space-y-3">
                  <h3 className="text-[13px] font-bold flex items-center gap-2 text-purple-600"><Activity className="h-4 w-4" /> Data Comparison</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-gray-400 uppercase">Old Data</div>
                      <div className="p-3 bg-gray-50 rounded-lg space-y-2 border">
                        {Object.entries(details.before).map(([k, v]: [string, any]) => (
                          <div key={k} className="flex flex-col border-b last:border-0 pb-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-[12px] text-gray-600 truncate">{String(v ?? "None")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-[11px] font-bold text-gray-400 uppercase">New Data</div>
                      <div className="p-3 bg-indigo-50/20 border border-indigo-100 rounded-lg space-y-2">
                        {Object.entries(details.after).map(([k, v]: [string, any]) => (
                          <div key={k} className="flex flex-col border-b border-indigo-100/30 last:border-0 pb-1">
                            <span className="text-[10px] font-bold text-indigo-400 uppercase">{k.replace(/([A-Z])/g, ' $1')}</span>
                            <span className="text-[12px] text-gray-900 font-bold truncate">{String(v ?? "None")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {details && !details.modifications && !details.before && (
                <div className="space-y-3">
                  <h3 className="text-[13px] font-bold flex items-center gap-2 text-gray-500"><Info className="h-4 w-4" /> Details</h3>
                  <div className="p-4 bg-gray-50 rounded-xl border space-y-3 text-[13px]">
                    {typeof details === 'object' ? Object.entries(details).map(([key, value]) => (
                      <div key={key} className="flex flex-col border-b last:border-0 pb-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase">{key.replace(/([A-Z])/g, ' $1')}</span>
                        <span>{Array.isArray(value) ? value.join(", ") : String(value)}</span>
                      </div>
                    )) : String(details)}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setSelectedLog(null)} variant="outline">Close Details</Button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
