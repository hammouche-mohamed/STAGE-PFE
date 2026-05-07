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

interface Internship {
  id: string;
  topic: { title: string; description: string };
  teacher: { name: string; email: string };
  students: { student: { name: string; email: string } }[];
  status: string;
  academicYear: string;
  defense?: { id: string; scheduledAt: string; room: string } | null;
}

export default function CompanyInternshipDetailPage() {
  const { id } = useParams();
  const { t, isRTL } = useTranslation();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [evaluationScore, setEvaluationScore] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activationData, setActivationData] = useState({
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(addMonths(new Date(), 4), "yyyy-MM-dd"),
    supervisorName: "",
    supervisorEmail: "",
  });

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await fetch(`/api/internships/${id}`);
        const data = await res.json();
        setInternship(data.data);
      } catch (error) {
        toast.error("Failed to load internship details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInternship();
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
      // Refresh data
      const updatedRes = await fetch(`/api/internships/${id}`);
      const updatedData = await updatedRes.json();
      setInternship(updatedData.data);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">{t("common.loading")}</div>;
  if (!internship) return <div className="p-8 text-center text-gray-400">{t("common.noData")}</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
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

      <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
        <h1 className="text-[20px] font-bold text-gray-900 mb-2">{internship.topic.title}</h1>
        <div className="flex items-center gap-4 text-[12px] text-gray-500 mb-6">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            {internship.academicYear}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {internship.students.length} {t("common.users")}
          </span>
        </div>
        <p className="text-[14px] text-gray-600 leading-relaxed">
          {internship.topic.description}
        </p>
      </div>

      {/* Activation Form (Only for DOCUMENT_SENT status) */}
      {internship.status === "DOCUMENT_SENT" && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-md p-6 shadow-sm">
          <h2 className="text-[15px] font-bold text-indigo-900 mb-2 flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2 text-indigo-600" />
            Confirm Internship Dates & Supervisor
          </h2>
          <p className="text-[12px] text-indigo-700 mb-6">
            The administration has sent the convention. Please confirm the actual start/end dates and provide the contact info for the technical supervisor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Input
              label="Start Date"
              type="date"
              value={activationData.startDate}
              onChange={(e) => setActivationData({ ...activationData, startDate: e.target.value })}
            />
            <Input
              label="End Date"
              type="date"
              value={activationData.endDate}
              onChange={(e) => setActivationData({ ...activationData, endDate: e.target.value })}
            />
            <Input
              label="Technical Supervisor Name"
              placeholder="e.g. Jean Dupont"
              value={activationData.supervisorName}
              onChange={(e) => setActivationData({ ...activationData, supervisorName: e.target.value })}
            />
            <Input
              label="Technical Supervisor Email"
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
            Confirm Dates & Activate
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h2 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center">
            <Users className="h-4 w-4 mr-2 text-indigo-500" />
            {t("dashboard.team")}
          </h2>
          <div className="space-y-4">
            {internship.students.map(s => (
              <div key={s.student.email} className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400">
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-gray-900">{s.student.name}</p>
                  <p className="text-[11px] text-gray-500">{s.student.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h2 className="text-[15px] font-bold text-gray-900 mb-4 flex items-center">
            <Star className="h-4 w-4 mr-2 text-amber-500" />
            {t("dashboard.supervisor")} — {t("status.COMPLETED")}
          </h2>
          <p className="text-[12px] text-gray-500 mb-6 leading-relaxed">
            Please submit the final score for the students you hosted. This score will contribute to their final academic grade.
          </p>

          <div className="space-y-4">
            <div>
              <label className="text-[12px] font-bold text-gray-700 block mb-2">Technical Evaluation Score (0-20)</label>
              <input
                type="number"
                min="0"
                max="20"
                className="admin-input"
                value={evaluationScore}
                onChange={(e) => setEvaluationScore(parseFloat(e.target.value))}
                placeholder="Enter score..."
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
    </div>
  );
}
