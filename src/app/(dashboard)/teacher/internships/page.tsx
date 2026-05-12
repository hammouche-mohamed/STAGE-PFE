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

      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("nav.supervision")}</th>
              <th>{t("common.users")}</th>
              <th>{t("common.status")}</th>
              <th>{t("common.date")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">{t("common.loading")}</td></tr>
            ) : internships.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">{t("common.noData")}</td></tr>
            ) : (
              internships.map((internship) => (
                <tr key={internship.id} className="admin-table-row">
                  <td data-label="Topic">
                    <div className="flex flex-col gap-1 text-right sm:text-left">
                      <span className="font-bold text-gray-900 dark:text-white leading-tight">
                        {internship.topic.title}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">PFE {academicYear}</span>
                    </div>
                  </td>
                  <td data-label="Users">
                    <div className="flex flex-col gap-0.5 text-right sm:text-left">
                      <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                        <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                        <span className="text-[12px] text-gray-600 dark:text-gray-300">
                          {internship.students.map(s => s.student.name).join(", ")}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={internship.status} />
                  </td>
                  <td data-label="Date">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{format(new Date(internship.createdAt), "MMM d, yyyy")}</span>
                  </td>
                  <td data-label="View" className="text-right">
                    <div className="flex items-center justify-end gap-4">
                      <div className="flex items-center gap-4 mr-4 hidden md:flex">
                        <div className="text-center px-2">
                          <p className="text-[13px] font-bold text-gray-900 dark:text-white">{internship._count.documents}</p>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">{t("common.documents")}</p>
                        </div>
                        <div className="text-center px-2">
                          <p className="text-[13px] font-bold text-gray-900 dark:text-white">{internship._count.messages}</p>
                          <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold uppercase">{t("common.messages")}</p>
                        </div>
                      </div>
                      <Link
                        href={`/teacher/internships/${internship.id}`}
                        className="h-8 w-8 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                        aria-label={`View internship ${internship.topic.title}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
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
