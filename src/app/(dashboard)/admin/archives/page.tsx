"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Download, Filter, Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";
import { ShieldCheck } from "lucide-react";

interface MessageThread {
  internshipId: string;
  topic: string;
  internshipType: string;
  students: string[];
  teacher: string;
  lastMessage: string;
  lastSentAt: string;
  totalMessages: number;
  academicYear: string;
}

export default function AdminArchivesPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [filiereFilter, setFiliereFilter] = useState<string>("all");
  const [filieres, setFilieres] = useState<any[]>([]);
  const [exportYear, setExportYear] = useState<string>("");
  const [exportType, setExportType] = useState<string>("all");
  const [exportFiliere, setExportFiliere] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Accurate Year Generation (Transition on September 1st)
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-indexed, 8 is September
  const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  
  const years = Array.from({ length: 4 }, (_, i) => {
    const y = startYear - i;
    return `${y}-${y + 1}`;
  });

  useEffect(() => {
    if (session?.user?.isSuperAdmin) {
      fetch("/api/filieres")
        .then(res => res.json())
        .then(data => setFilieres(data.data || []));
    }
  }, [session]);

  useEffect(() => {
    const fetchThreads = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedYear !== "all") params.set("year", selectedYear);
        if (filiereFilter !== "all") params.set("filiereId", filiereFilter);
        const res = await fetch(`/api/admin/messages?${params}`);
        const data = await res.json();
        setThreads(data.data || []);
      } catch {
        toast.error("Failed to load message threads");
      } finally {
        setIsLoading(false);
      }
    };
    fetchThreads();
  }, [selectedYear, filiereFilter]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType });
      if (selectedYear !== "all") params.set("year", selectedYear);
      if (filiereFilter !== "all") params.set("filiereId", filiereFilter);
      
      const res = await fetch(`/api/admin/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archive_${selectedYear}_${exportType}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Archive className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            {t("nav.archives")}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Oversight of all internship communication threads. Records are kept for a rolling 3-year period.
          </p>
        </div>
      </div>

      {/* Archive Info Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-lg px-4 py-3 flex items-start gap-3">
        <Archive className="h-4 w-4 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
        <div className="text-[12px] text-indigo-900 dark:text-indigo-300">
          <p className="font-bold mb-1">Data Retention & Transitions:</p>
          <p>
            The portal maintains a rolling history. To start a new year, update the <strong>Academic Year</strong> in the <a href="/admin/settings" className="underline font-bold">Settings</a> page. 
            Data is <strong>never automatically deleted</strong>; the 3-year purging policy is a recommendation to keep your database performant. 
            Ensure you have exported CSV backups before performing any manual deletions.
          </p>
        </div>
      </div>

      {/* Thread List Table with Integrated Filters */}
      <div className="admin-table-container">
        {/* Unified Filter & Export Bar */}
        <div className="p-3 sm:p-4 bg-gray-50/50 dark:bg-slate-800/30 border-b border-gray-100 dark:border-slate-800 flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 min-w-max">
              <Filter className="h-4 w-4 text-gray-400 dark:text-gray-500" />
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Archives View</span>
            </div>
            
            <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
              {["all", ...years].map((y) => (
                <button
                  key={y}
                  onClick={() => setSelectedYear(y)}
                  className={`px-3 py-1.5 text-[11px] rounded-md font-bold transition-all whitespace-nowrap ${
                    selectedYear === y
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-200/20"
                      : "bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:border-indigo-400"
                  }`}
                >
                  {y === "all" ? "All Years" : y}
                </button>
              ))}
            </div>

            <div className="flex sm:hidden w-full">
              <select
                className="admin-input text-[12px] h-9 py-0 w-full"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="all">All Academic Years</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {session?.user?.isSuperAdmin && (
            <div className="flex items-center gap-2 w-full md:w-auto md:pl-6 md:border-l border-gray-200 dark:border-slate-700">
              <div className="relative w-full md:min-w-[220px]">
                <select
                  className="admin-input text-[12px] h-9 py-0 w-full appearance-none bg-white dark:bg-slate-800 pr-10 hover:border-indigo-400 transition-colors"
                  value={filiereFilter}
                  onChange={(e) => setFiliereFilter(e.target.value)}
                >
                  <option value="all">Global Oversight (All Depts)</option>
                  {filieres.map(f => (
                    <option key={f.id} value={f.id} className="dark:bg-slate-900 dark:text-white py-2">{f.name}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <Filter className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto md:pl-6 md:border-l border-gray-200 dark:border-slate-700 md:ml-auto">
            <div className="relative w-full sm:min-w-[180px]">
              <select
                className="admin-input text-[11px] py-1 h-9 w-full appearance-none bg-white dark:bg-slate-800 pr-10 hover:border-indigo-400 transition-colors"
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                <option value="all" className="dark:bg-slate-900 dark:text-white py-2">Full Backup (CSV)</option>
                <option value="internships" className="dark:bg-slate-900 dark:text-white py-2">Internships List</option>
                <option value="messages" className="dark:bg-slate-900 dark:text-white py-2">Chat History</option>
                <option value="documents" className="dark:bg-slate-900 dark:text-white py-2">Student Documents</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Download className="h-3 w-3" />
              </div>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={handleExport} 
              isLoading={isExporting} 
              className="h-9 text-[11px] font-bold border-indigo-200 dark:border-slate-700 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 dark:hover:text-white text-indigo-700 dark:text-indigo-400 w-full sm:min-w-[160px] transition-all shadow-sm group"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 transition-transform group-hover:-translate-y-0.5" />
              Generate CSV
            </Button>
          </div>
        </div>

        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>Topic / Team</th>
              <th>Type</th>
              <th>Academic Year</th>
              <th>Teacher</th>
              <th className="text-center">Messages</th>
              <th>Last Activity</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-[13px]">
                  {t("common.loading")}
                </td>
              </tr>
            ) : threads.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={6} className="text-center py-16 text-gray-400 text-[13px] font-medium" data-label="">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Archive className="h-8 w-8 opacity-20 mb-2" />
                    {t("common.noData")}
                  </div>
                </td>
              </tr>
            ) : (
              threads.map((t) => (
                <tr key={t.internshipId} className="admin-table-row">
                  <td data-label="Topic / Team">
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white text-[13px] sm:truncate sm:max-w-[260px]">
                        {t.topic}
                      </p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                        {t.students.join(" & ")}
                      </p>
                    </div>
                  </td>
                  <td data-label="Type">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase ${
                        t.internshipType === "PFE"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {t.internshipType || "—"}
                    </span>
                  </td>
                  <td data-label="Year" className="text-[12px] text-gray-500 dark:text-gray-400">{t.academicYear}</td>
                  <td data-label="Teacher" className="text-[12px] text-gray-700 dark:text-gray-300">{t.teacher}</td>
                  <td data-label="Total" className="text-center">
                    <span className="text-[13px] font-bold text-indigo-700 dark:text-indigo-400">{t.totalMessages}</span>
                  </td>
                  <td data-label="Last" className="text-[12px] text-gray-500 dark:text-gray-400">
                    {t.lastSentAt
                      ? format(new Date(t.lastSentAt), "MMM d, yyyy HH:mm")
                      : "—"}
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
