"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { BarChart2, TrendingUp, Clock, CheckCircle, Users } from "lucide-react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { toast } from "sonner";

interface StatsData {
  academicYear: string;
  totalActive: number;
  totalCompleted: number;
  completionRate: number;
  avgCompletionDays: number;
  byType: { type: string; count: number }[];
  topCompanies: { companyName: string; internshipCount: number }[];
}

const TYPE_COLORS: Record<string, string> = {
  PFE: "#7c3aed",
  NORMAL: "#059669",
  UNKNOWN: "#9ca3af",
};

export default function StatisticsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"" | "PFE" | "NORMAL">("");

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/admin/statistics?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStats(data.data);
    } catch {
      toast.error("Failed to load statistics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-600" />
            Internship Statistics
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {stats ? `Academic Year: ${stats.academicYear}` : "Loading…"}
          </p>
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-gray-500">Filter by type:</span>
          {(["", "PFE", "NORMAL"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                typeFilter === t
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "" ? "All" : t}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-gray-400">Loading statistics…</div>
      ) : stats ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              label="Active Internships"
              value={stats.totalActive}
              icon={TrendingUp}
              subValue="Currently in progress"
            />
            <StatsCard
              label="Completed"
              value={stats.totalCompleted}
              icon={CheckCircle}
              subValue="Archived successfully"
              subValueColor="green"
            />
            <StatsCard
              label="Completion Rate"
              value={`${stats.completionRate}%`}
              icon={BarChart2}
              subValue="Of all internships"
            />
            <StatsCard
              label="Avg. Duration"
              value={`${stats.avgCompletionDays} days`}
              icon={Clock}
              subValue="From activation to completion"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PFE vs NORMAL pie chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-4 uppercase tracking-wider">
                Internships by Type
              </h2>
              {stats.byType.length === 0 ? (
                <p className="text-[12px] text-gray-400 text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={stats.byType}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ type, percent }: any) =>
                        `${type} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {stats.byType.map((entry) => (
                        <Cell
                          key={entry.type}
                          fill={TYPE_COLORS[entry.type] ?? "#9ca3af"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} internships`]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Top companies bar chart */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <h2 className="text-[13px] font-semibold text-gray-900 mb-4 uppercase tracking-wider flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-600" />
                Top 5 Host Companies
              </h2>
              {stats.topCompanies.length === 0 ? (
                <p className="text-[12px] text-gray-400 text-center py-8">No data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={stats.topCompanies}
                    layout="vertical"
                    margin={{ left: 10, right: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="companyName"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip formatter={(v) => [`${v} intern(s)`]} />
                    <Bar dataKey="internshipCount" fill="#4f46e5" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      ) : (
        <p className="text-center text-gray-400">No statistics available.</p>
      )}
    </div>
  );
}
