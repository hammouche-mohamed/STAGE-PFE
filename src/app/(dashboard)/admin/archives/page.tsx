"use client";

import React, { useEffect, useState } from "react";
import { Archive, Calendar, Search, Building2, GraduationCap, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface ArchivedInternship {
  id: string;
  academicYear: string;
  status: string;
  archivedAt: string;
  chatArchivedAt: string;
  topic: { title: string; internshipType: string; companyName?: string | null };
  teacher: { name: string };
  students: { student: { name: string } }[];
}

export default function AdminArchivesPage() {
  const { t } = useTranslation();
  const [internships, setInternships] = useState<ArchivedInternship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/internships?archived=true&all=true")
      .then((r) => r.json())
      .then((d) => setInternships(d.data || []))
      .catch(() => toast.error(t("toast.loadFailed")))
      .finally(() => setIsLoading(false));
  }, [t]);

  const years = ["ALL", ...Array.from(new Set(internships.map((i) => i.academicYear))).sort((a, b) => b.localeCompare(a))];

  const filtered = internships.filter((i) => {
    const matchSearch =
      i.topic.title.toLowerCase().includes(search.toLowerCase()) ||
      i.teacher.name.toLowerCase().includes(search.toLowerCase()) ||
      i.students.some((s) => s.student.name.toLowerCase().includes(search.toLowerCase()));
    const matchYear = yearFilter === "ALL" || i.academicYear === yearFilter;
    return matchSearch && matchYear;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <Archive className="h-5 w-5 text-indigo-600" /> {t("archivesPage.title")}
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            {t("archivesPage.subtitle")}
          </p>
        </div>
        <span className="px-3 py-1 bg-gray-100 text-gray-600 text-[12px] font-semibold rounded-full">
          {internships.length} {t("common.all")}
        </span>
      </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("common.search")}
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-input w-auto min-w-[160px]"
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
        >
          {years.map((y) => <option key={y} value={y}>{y === "ALL" ? t("common.all") : `${t("archivesPage.academicYear", { year: y })}`}</option>)}
        </select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-16 text-center text-gray-400 text-[13px]">{t("common.loading")}</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-gray-500">{t("archivesPage.noArchives")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((internship) => {
            const chatLocked = new Date(internship.chatArchivedAt) < new Date();
            return (
              <div key={internship.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={internship.status} />
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        internship.topic.internshipType === "PFE" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {internship.topic.internshipType}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">{internship.academicYear}</span>
                    </div>

                    <h3 className="text-[14px] font-semibold text-gray-900">{internship.topic.title}</h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3.5 w-3.5" /> {internship.teacher.name}
                      </span>
                      {internship.students.map((s) => (
                        <span key={s.student.name} className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" /> {s.student.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-[11px] text-gray-400">
                      {t("archivesPage.archivedOn", { date: format(new Date(internship.archivedAt), "dd MMM yyyy") })}
                    </p>
                    <span className={`flex items-center gap-1 text-[11px] justify-end ${chatLocked ? "text-gray-400" : "text-amber-600"}`}>
                      <MessageSquare className="h-3.5 w-3.5" />
                      {chatLocked ? t("archivesPage.chatLocked") : t("archivesPage.chatGrace", { date: format(new Date(internship.chatArchivedAt), "dd MMM") })}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
