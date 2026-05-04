"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { MessageSquare, Download, Filter, Archive } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";

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

export default function AdminMessagesPage() {
  const { t, isRTL } = useTranslation();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [exportYear, setExportYear] = useState<string>("");
  const [exportType, setExportType] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Generate last 3 academic years dynamically
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => {
    const y = currentYear - i;
    return `${y}-${y + 1}`;
  });

  useEffect(() => {
    const fetchThreads = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedYear !== "all") params.set("year", selectedYear);
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
  }, [selectedYear]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType });
      if (exportYear) params.set("year", exportYear);
      const res = await fetch(`/api/admin/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `history_${exportYear || "all"}_${exportType}_${new Date().toISOString().split("T")[0]}.csv`;
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
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-indigo-600" />
            {t("nav.messages")}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Oversight of all internship communication threads. Download records per academic year.
          </p>
        </div>

        {/* Export Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="admin-input text-[12px] py-1.5 h-auto"
            value={exportYear}
            onChange={(e) => setExportYear(e.target.value)}
          >
            <option value="">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select
            className="admin-input text-[12px] py-1.5 h-auto"
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
          >
            <option value="all">All data</option>
            <option value="internships">Internships only</option>
            <option value="messages">Messages only</option>
            <option value="documents">Documents only</option>
          </select>
          <Button size="sm" onClick={handleExport} isLoading={isExporting}>
            <Download className="h-4 w-4 mr-1.5" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      {/* Archive Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-3">
        <Archive className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-amber-800">
          <strong>Automatic archiving:</strong> Records older than 3 academic years are automatically purged every September 1st.
          Download the CSV export before that date to preserve historical data permanently.
        </p>
      </div>

      {/* Year Filter */}
      <div className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-gray-400" />
        <span className="text-[12px] text-gray-500">Filter by year:</span>
        {["all", ...years].map((y) => (
          <button
            key={y}
            onClick={() => setSelectedYear(y)}
            className={`px-3 py-1 text-[12px] rounded-full font-medium transition-colors ${
              selectedYear === y
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {y === "all" ? "All Years" : y}
          </button>
        ))}
      </div>

      {/* Thread List */}
      <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
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
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 text-[13px]">
                  {t("common.noData")}
                </td>
              </tr>
            ) : (
              threads.map((t) => (
                <tr key={t.internshipId} className="admin-table-row">
                  <td data-label="Topic / Team">
                    <div className="text-left">
                      <p className="font-medium text-gray-900 text-[13px] sm:truncate sm:max-w-[260px]">
                        {t.topic}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
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
                  <td data-label="Year" className="text-[12px] text-gray-500">{t.academicYear}</td>
                  <td data-label="Teacher" className="text-[12px] text-gray-700">{t.teacher}</td>
                  <td data-label="Total" className="text-center">
                    <span className="text-[13px] font-bold text-indigo-700">{t.totalMessages}</span>
                  </td>
                  <td data-label="Last" className="text-[12px] text-gray-500">
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
