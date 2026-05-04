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
  GraduationCap,
  ExternalLink
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
}

export default function CompanyInternshipsPage() {
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("common.internships")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("dashboard.activeInternships")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-400">{t("common.loading")}</div>
        ) : internships.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">
            {t("common.noData")}
          </div>
        ) : (
          internships.map((internship) => (
            <div key={internship.id} className="bg-white border border-gray-200 rounded-md p-6 flex flex-col justify-between hover:border-indigo-400 transition-all shadow-sm group">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                     <StatusBadge status={internship.status} />
                     <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{internship.academicYear}</span>
                  </div>
                  <Link href={`/company/internships/${internship.id}`} className="inline-flex p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                </div>

                <h3 className="text-[15px] font-bold text-gray-900 leading-tight">
                  {internship.topic.title}
                </h3>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center text-[12px] text-gray-600">
                    <Users className="h-4 w-4 mr-2 text-indigo-400" />
                    <span className="font-semibold mr-1">{t("common.users")}:</span>
                    {internship.students.map(s => s.student.name).join(", ")}
                  </div>
                  <div className="flex items-center text-[12px] text-gray-600">
                    <GraduationCap className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-semibold mr-1">{t("dashboard.supervisor")}:</span>
                    {internship.teacher.name}
                  </div>
                  <div className="flex items-center text-[12px] text-gray-600">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    <span className="font-semibold mr-1">Started:</span>
                    {format(new Date(internship.createdAt), "MMMM d, yyyy")}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-50 flex items-center justify-between">
                <button className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide flex items-center hover:underline">
                  {t("common.view")}
                  <ArrowRight className="ml-1 h-3 w-3" />
                </button>
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


