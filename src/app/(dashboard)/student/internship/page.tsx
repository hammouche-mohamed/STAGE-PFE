"use client";

import React, { useEffect, useState } from "react";
import { 
  Briefcase, 
  User, 
  MapPin, 
  Calendar, 
  FileText, 
  MessageSquare,
  ArrowRight,
  GraduationCap,
  Building2,
  CheckCircle2,
  Clock
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Internship {
  id: string;
  topic: { title: string; type: string; description: string };
  teacher: { name: string; email: string };
  status: string;
  academicYear: string;
}

export default function StudentInternshipPage() {
  const { t, isRTL } = useTranslation();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInternship = async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      // Student typically only has one active internship
      setInternship(data.data?.[0] || null);
    } catch (error) {
      toast.error(t("toast.loadInternshipFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInternship();
  }, []);

  if (isLoading) return <div className="text-center py-12 text-gray-400">{t("common.loading")}</div>;

  if (!internship) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
          <Briefcase className="h-8 w-8" />
        </div>
        <h2 className="text-[18px] font-bold text-gray-900">{t("internship.noInternship")}</h2>
        <p className="text-gray-500 text-[14px]">{t("dashboard.browseTopics")}</p>
        <div className="pt-4">
           <a href="/student/topics" className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md text-[13px] font-medium hover:bg-indigo-700 transition-colors">
              {t("topics.title")}
              <ArrowRight className="ml-2 h-4 w-4" />
           </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
             <StatusBadge status={internship.status} />
             <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{internship.academicYear}</span>
          </div>
          <h1 className="text-[20px] font-bold text-gray-900">{internship.topic.title}</h1>
        </div>
        <div className="flex items-center gap-2">
           <button className="px-4 py-2 bg-white border border-gray-200 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center shadow-sm transition-all">
              <MessageSquare className="h-4 w-4 mr-2 text-indigo-500" />
              Open Chat
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <h2 className="text-[14px] font-bold text-gray-900 mb-4 flex items-center">
               {t("topics.internshipType")}
            </h2>
            <p className="text-[14px] text-gray-600 leading-relaxed">
               {internship.topic.description}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <h2 className="text-[14px] font-bold text-gray-900 mb-4 flex items-center">
               {t("common.milestones")}
            </h2>
            <div className="space-y-4">
               <div className="relative pl-8 pb-4 border-l-2 border-indigo-100 last:pb-0">
                  <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-indigo-600 flex items-center justify-center">
                     <CheckCircle2 className="h-3 w-3 text-white" />
                  </div>
                  <p className="text-[13px] font-bold text-gray-900">Topic Validation</p>
                  <p className="text-[11px] text-gray-400">Completed on March 15, 2024</p>
               </div>
               <div className="relative pl-8 pb-4 border-l-2 border-indigo-100 last:pb-0">
                  <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-indigo-100 border-2 border-indigo-600 flex items-center justify-center">
                     <div className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
                  </div>
                  <p className="text-[13px] font-bold text-gray-900">Mid-term Progress Report</p>
                  <p className="text-[11px] text-indigo-600 font-medium">Due in 12 days (May 1st)</p>
               </div>
               <div className="relative pl-8 pb-0 border-l-2 border-transparent">
                  <div className="absolute left-[-9px] top-0 h-4 w-4 rounded-full bg-gray-100 flex items-center justify-center">
                     <Clock className="h-3 w-3 text-gray-400" />
                  </div>
                  <p className="text-[13px] font-bold text-gray-400">Final Dissertation Upload</p>
                  <p className="text-[11px] text-gray-400">Scheduled for June 15, 2024</p>
               </div>
            </div>
          </div>
        </div>

        {/* Sidebar Contacts */}
        <div className="space-y-4">
           <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm space-y-6">
              <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Academic Supervisor</p>
                 <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[14px]">
                       {internship.teacher.name.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[13px] font-bold text-gray-900">{internship.teacher.name}</p>
                       <p className="text-[11px] text-gray-500">Teacher - Faculty of Computing</p>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Company Details</p>
                 <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded bg-amber-50 text-amber-700 flex items-center justify-center">
                       <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                       <p className="text-[13px] font-bold text-gray-900">Partner Company</p>
                       <p className="text-[11px] text-gray-500">Industry Partner</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-gray-900 rounded-md p-5 text-white shadow-lg overflow-hidden relative">
              <div className="relative z-10">
                 <FileText className="h-6 w-6 text-indigo-400 mb-4" />
                 <h3 className="text-[15px] font-bold">Document Library</h3>
                 <p className="text-[12px] text-gray-400 mt-2 leading-relaxed">
                    Access all your shared documents, reports, and signed conventions in one place.
                 </p>
                 <a href="/student/documents" className="mt-4 inline-flex items-center text-[12px] font-bold text-indigo-400 uppercase tracking-wide hover:underline">
                    Manage Documents
                    <ArrowRight className="ml-1 h-3 w-3" />
                 </a>
              </div>
              {/* Background accent */}
              <div className="absolute -bottom-10 -right-10 h-32 w-32 bg-indigo-500/10 rounded-full blur-2xl" />
           </div>
        </div>
      </div>
    </div>
  );
}
