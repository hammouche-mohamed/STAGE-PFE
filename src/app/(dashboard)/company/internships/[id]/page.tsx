"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  Users,
  CheckCircle2,
  Clock,
  Star,
  FileText,
  AlertCircle,
  Calendar,
  User
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format, addMonths } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Input } from "@/components/ui/Input";
import { DocumentList } from "@/components/documents/DocumentList";
import { InternshipDocument } from "@/types/document";
import SetBreadcrumb from "@/components/layout/SetBreadcrumb";

interface Internship {
  id: string;
  topic: { title: string; description: string };
  teacher: { name: string; email: string };
  students: { student: { name: string; email: string } }[];
  status: string;
  academicYear: string;
  internshipType?: string | null;
  finalDeadline?: string | null;
  defense?: { id: string; scheduledAt: string; room: string } | null;
}

export default function CompanyInternshipDetailPage() {
  const { id } = useParams();
  const { t, isRTL } = useTranslation();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [documents, setDocuments] = useState<InternshipDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationScore, setEvaluationScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activationData, setActivationData] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addMonths(new Date(), 4), "yyyy-MM-dd"),
    supervisorName: "",
    supervisorEmail: "",
  });

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/internships/${id}`);
      const data = await res.json();
      setInternship(data.data);

      const docRes = await fetch(`/api/documents?internshipId=${id}`);
      const docData = await docRes.json();
      setDocuments(docData.data || []);
    } catch (error) {
      toast.error("Failed to load internship details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleSubmitEvaluation = async () => {
    if (evaluationScore < 0 || evaluationScore > 20) {
      toast.error("Score must be between 0 and 20");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/internships/${id}/evaluation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: evaluationScore }),
      });
      if (!res.ok) throw new Error("Submission failed");
      toast.success("Final evaluation score submitted successfully");
    } catch (error) {
      toast.error("Failed to submit evaluation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActivate = async () => {
    if (!activationData.supervisorName || !activationData.supervisorEmail) {
      toast.error("Please provide supervisor name and email");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/internships/${id}/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(activationData.startDate).toISOString(),
          endDate: new Date(activationData.endDate).toISOString(),
          technicalSupervisorName: activationData.supervisorName,
          technicalSupervisorEmail: activationData.supervisorEmail,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Activation failed");
      }

      toast.success("Internship activated and dates confirmed");
      fetchData();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDocumentReview = async (docId: string, status: "APPROVED" | "REJECTED", comment: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewComment: comment }),
      });
      if (!res.ok) throw new Error("Review failed");
      toast.success(`Document ${status.toLowerCase()} successfully`);
      
      const docRes = await fetch(`/api/documents?internshipId=${id}`);
      const docData = await docRes.json();
      setDocuments(docData.data || []);
    } catch (error) {
      toast.error("Failed to process document review");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t("common.loading")}</div>;
  if (!internship) return <div className="p-8 text-center text-gray-400">{t("common.noData")}</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      <SetBreadcrumb segment={String(id)} label={internship.topic.title} />
      <div className="flex items-center justify-between">
        <Link
          href="/company/internships"
          className="inline-flex items-center gap-2 text-[13px] text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>
        <StatusBadge status={internship.status} />
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
        <h1 className="text-[20px] font-bold text-gray-900 dark:text-white mb-2">{internship.topic.title}</h1>
        <div className="flex items-center gap-4 text-[12px] text-gray-500 dark:text-gray-400 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {internship.academicYear}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {internship.students.length} {t("common.users")}
          </span>
        </div>
        <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed">
          {internship.topic.description}
        </p>
      </div>

      {internship.status === "DOCUMENT_SENT" && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-md p-6 shadow-sm">
          <h2 className="text-[15px] font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-indigo-600" />
            {t("company.detail.confirmDatesTitle")}
          </h2>

          {internship.internshipType === "PFE" ? (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800/30 rounded-md p-4 mb-4">
              <p className="text-[13px] text-purple-800 dark:text-purple-300 font-semibold mb-1">{t("company.detail.pfeNoteTitle")}</p>
              <p className="text-[12px] text-purple-700 dark:text-purple-200/80">
                {t("company.detail.pfeNoteDesc")}
                {internship.finalDeadline
                  ? t("company.detail.pfeNoteEnd", { date: format(new Date(internship.finalDeadline), "PPP") })
                  : t("company.detail.pfeNoteNoDeadline")}
              </p>
            </div>
          ) : (
            <p className="text-[12px] text-indigo-700 dark:text-indigo-300 mb-6">
              {t("company.detail.conventionSent")}
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label={t("company.detail.startDate")}
              type="date"
              value={activationData.startDate}
              onChange={(e) => setActivationData({ ...activationData, startDate: e.target.value })}
            />
            {internship.internshipType !== "PFE" && (
              <Input
                label={t("company.detail.endDate")}
                type="date"
                value={activationData.endDate}
                onChange={(e) => setActivationData({ ...activationData, endDate: e.target.value })}
              />
            )}
            <Input
              label={t("company.detail.supervisorName")}
              placeholder="e.g. Jean Dupont"
              value={activationData.supervisorName}
              onChange={(e) => setActivationData({ ...activationData, supervisorName: e.target.value })}
            />
            <Input
              label={t("company.detail.supervisorEmail")}
              type="email"
              placeholder="supervisor@company.com"
              value={activationData.supervisorEmail}
              onChange={(e) => setActivationData({ ...activationData, supervisorEmail: e.target.value })}
            />
          </div>
          <Button
            className="w-full md:w-auto px-8"
            onClick={handleActivate}
            isLoading={isSubmitting}
          >
            {t("company.detail.confirmActivate")}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="h-4 w-4 mr-2 text-indigo-500" />
            {t("dashboard.team")}
          </h2>
          <div className="space-y-4">
            {internship.students.map(s => (
              <div key={s.student.email} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-800/50 rounded-md border border-transparent dark:border-slate-700/50">
                <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900 dark:text-white">{s.student.name}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.student.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Star className="h-4 w-4 mr-2 text-amber-500" />
            {t("dashboard.supervisor")} — {t("status.COMPLETED")}
          </h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            {t("company.detail.finalScoreDesc")}
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 block mb-2">{t("company.detail.techScore")}</label>
              <input
                type="number"
                min="0"
                max="20"
                className="admin-input"
                value={evaluationScore}
                onChange={(e) => setEvaluationScore(parseFloat(e.target.value))}
                placeholder={t("company.detail.scorePh")}
              />
            </div>
            <Button
              onClick={handleSubmitEvaluation}
              isLoading={isSubmitting}
              className="w-full"
              disabled={internship.status === "COMPLETED"}
            >
              {t("common.confirm")}
            </Button>
            {internship.status === "COMPLETED" && (
              <p className="text-[11px] text-green-600 flex items-center justify-center gap-1.5 mt-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {t("status.COMPLETED")}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
        <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-between">
           <div className="flex items-center">
              <FileText className="h-4 w-4 mr-2 text-indigo-500" />
              {t("company.detail.documents")}
           </div>
           <div className="flex items-center gap-2">
             {documents.filter((d) => d.status === "UPLOADED").length > 0 && (
               <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-green-700 dark:text-green-400">
                 <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                 {documents.filter((d) => d.status === "UPLOADED").length}{" "}
                 {t("documents.toValidate", { defaultValue: "to validate" })}
               </span>
             )}
             <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 px-2 py-1 rounded">
                {documents.length} {t("company.detail.files")}
             </span>
           </div>
        </h2>
        <DocumentList 
           documents={documents}
           canReview={true}
           onReview={handleDocumentReview}
        />
      </div>
    </div>
  );
}
