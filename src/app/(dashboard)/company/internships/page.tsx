"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  Briefcase, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  LayoutDashboard,
  GraduationCap
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Internship {
  id: string;
  topic: { title: string; type: string };
  teacher: { name: string };
  students: { student: { name: string; email: string } }[];
  status: string;
  academicYear: string;
  createdAt: string;
  pendingDocuments?: number;
}

export default function CompanyInternshipsPage() {
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "PENDING">("ALL");

  const fetchInternships = async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      setInternships(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadInternshipsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, []);

  const pendingCount = internships.filter((i) => (i.pendingDocuments ?? 0) > 0).length;
  const visibleInternships =
    filter === "PENDING"
      ? internships.filter((i) => (i.pendingDocuments ?? 0) > 0)
      : internships;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("common.internships")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("dashboard.activeInternships")}</p>
        </div>

        {/* Filter: all vs. only those with documents awaiting validation */}
        <div className="inline-flex rounded-md border border-gray-200 dark:border-slate-700 p-0.5 bg-gray-50 dark:bg-slate-800/50 self-start">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors ${
              filter === "ALL"
                ? "bg-white dark:bg-slate-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {t("common.all", { defaultValue: "All" })}
          </button>
          <button
            onClick={() => setFilter("PENDING")}
            className={`px-3 py-1.5 text-[12px] font-semibold rounded transition-colors inline-flex items-center gap-1.5 ${
              filter === "PENDING"
                ? "bg-white dark:bg-slate-900 text-green-700 dark:text-green-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-green-500" />
            {t("documents.needsValidation", { defaultValue: "Needs validation" })}
            {pendingCount > 0 && (
              <span className="ml-1 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500">{t("common.loading")}</div>
        ) : visibleInternships.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
            {filter === "PENDING"
              ? t("documents.noneToValidate", { defaultValue: "Nothing awaiting validation." })
              : t("common.noData")}
          </div>
        ) : (
          visibleInternships.map((internship) => (
            <div key={internship.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-900 transition-all shadow-sm group">
              <div className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                   <StatusBadge status={internship.status} />
                   <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{internship.academicYear}</span>
                   {(internship.pendingDocuments ?? 0) > 0 && (
                     <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
                       <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                       {internship.pendingDocuments} {t("documents.toValidate", { defaultValue: "to validate" })}
                     </span>
                   )}
                </div>

                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                  {internship.topic.title}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 pt-1">
                  <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                    <Users className="h-4 w-4 mr-2 text-indigo-400 dark:text-indigo-500" />
                    <span className="font-semibold mr-1">{t("common.users")}:</span>
                    <span className="truncate">{internship.students.map(s => s.student.name).join(", ")}</span>
                  </div>
                  <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                    <GraduationCap className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    <span className="font-semibold mr-1">{t("dashboard.supervisor")}:</span>
                    <span className="truncate">{internship.teacher.name}</span>
                  </div>
                  <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                    <Clock className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
                    <span className="font-semibold mr-1">Started:</span>
                    {format(new Date(internship.createdAt), "MMMM d, yyyy")}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-50 dark:border-slate-800 flex items-center justify-between">
                <Link href={`/company/internships/${internship.id}`}>
                  <button className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide flex items-center hover:underline">
                    {t("common.view")}
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </button>
                </Link>
                <Link href="/company/messages">
                   <Button size="sm" variant="outline" className="h-8">
                     {t("nav.messages")}
                   </Button>
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}


