"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Briefcase,
  MessageSquare,
  FileText,
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

interface Internship {
  id: string;
  topic: { title: string; type: string };
  students: { student: { name: string; email: string } }[];
  status: string;
  _count: { documents: number; messages: number };
  createdAt: string;
}

export default function TeacherInternshipsPage() {
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState("");

  const fetchInternships = async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      setInternships(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadSupervisionsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => setAcademicYear(d.data?.currentAcademicYear || "N/A"))
      .catch(() => setAcademicYear("N/A"));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("nav.supervision")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("dashboard.activeInternships")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">{t("common.loading")}</div>
        ) : internships.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">{t("common.noData")}</div>
        ) : (
          internships.map((internship) => (
            <div key={internship.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-300 dark:hover:border-indigo-900 transition-colors shadow-sm">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  <StatusBadge status={internship.status} />
                  <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">PFE {academicYear}</span>
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                  {internship.topic.title}
                </h3>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                    <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                    <span className="font-medium">{t("common.users")}: </span>
                    <span className="ml-1">
                      {internship.students.map(s => s.student.name).join(", ")}
                    </span>
                  </div>
                  <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                    <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                    <span>Started: {format(new Date(internship.createdAt), "MMM d, yyyy")}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-800 pt-4 md:pt-0 md:pl-6">
                <div className="flex items-center gap-4">
                  <div className="text-center px-4">
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white">{internship._count.documents}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{t("common.documents")}</p>
                  </div>
                  <div className="text-center px-4">
                    <p className="text-[14px] font-bold text-gray-900 dark:text-white">{internship._count.messages}</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{t("common.messages")}</p>
                  </div>
                </div>
                <Link
                  href={`/teacher/internships/${internship.id}`}
                  className="h-9 w-9 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
                  aria-label={`View internship ${internship.topic.title}`}
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
