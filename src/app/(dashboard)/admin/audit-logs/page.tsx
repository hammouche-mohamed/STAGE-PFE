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
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
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

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const searchLower = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(searchLower) ||
      log.targetId.toLowerCase().includes(searchLower) ||
      log.targetType.toLowerCase().includes(searchLower) ||
      log.user.name.toLowerCase().includes(searchLower)
    );
  });

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
    } catch (error: any) {
      toast.error(error.message || "Cleanup failed");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900 flex items-center">
            <ClipboardList className="h-5 w-5 mr-2 text-indigo-600" />
            System Audit logs
          </h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">Track all administrative actions and system events.</p>
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
            <span className="text-[11px] md:text-[13px]">Download CSV</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 sm:flex-none text-red-600 hover:bg-red-50"
            onClick={handleManualCleanup}
            isLoading={isCleaning}
          >
            <Trash2 className="h-4 w-4 mr-1 md:mr-2" />
            <span className="text-[11px] md:text-[13px]">Cleanup</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs by action, user, or target..."
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs}>
           <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
           Refresh
        </Button>
      </div>

      <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
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
                <td colSpan={5} className="text-center py-12 text-gray-400 italic">Fetching system records...</td>
              </tr>
            ) : filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">No logs found matching your criteria.</td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <tr key={log.id} className="admin-table-row">
                  <td data-label="Time" className="whitespace-nowrap py-3 sm:py-0">
                    <div className="flex items-center text-gray-500 text-[11px] sm:text-[12px]">
                      <Calendar className="h-3 w-3 mr-1.5 flex-shrink-0" />
                      {format(new Date(log.createdAt), "MMM d, HH:mm")}
                    </div>
                  </td>
                  <td data-label="Admin">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 flex-shrink-0">
                        {log.user.name.charAt(0)}
                      </div>
                      <div className="flex flex-col min-w-0 items-start">
                        <span className="text-[12px] sm:text-[13px] font-medium text-gray-900 truncate">{log.user.name}</span>
                        <span className="text-[10px] text-gray-500 truncate">{log.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Action">
                    <span className="text-[10px] sm:text-[12px] font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100 italic whitespace-nowrap">
                       {log.action.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td data-label="Target">
                    <span className="text-[13px] font-medium text-gray-900">
                      {log.targetId}
                    </span>
                  </td>
                  <td data-label="Type">
                    <div className="flex items-center text-[12px] text-gray-500">
                      <Activity className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      {log.targetType}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg flex items-start gap-3">
         <div className="p-1.5 bg-blue-100 rounded text-blue-700">
            <RefreshCw className="h-4 w-4" />
         </div>
         <div className="text-[13px] text-blue-800 leading-relaxed">
            <strong>System Maintenance:</strong> Automatic log rotation is enabled. Logs older than 365 days are automatically pruned to maintain system performance. Always download a CSV report before performing manual cleanup.
         </div>
      </div>
    </div>
  );
}
