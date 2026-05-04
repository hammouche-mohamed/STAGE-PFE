"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  Building2, FileText, User, Mail, Phone, MapPin, AlertCircle, Upload, Info,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const proposalSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  requiredSkills: z.string().optional(),
  internshipType: z.enum(["PFE", "NORMAL"]),
  companyName: z.string().min(2, "Company name is required"),
  companySector: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  contactPerson: z.string().min(2, "Contact person name is required"),
  contactEmail: z.string().email("Invalid contact email"),
  contactPhone: z.string().optional(),
  supportingDocUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

export default function ProposeTopicPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  // L1/L2/M1 can only propose NORMAL; L3/M2 can choose
  const studentLevel = (session?.user as any)?.level as string | undefined;
  const normalOnlyLevels = ["L1", "L2", "M1"];
  const isNormalOnly = studentLevel ? normalOnlyLevels.includes(studentLevel) : false;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      internshipType: isNormalOnly ? "NORMAL" : "PFE",
    },
  });

  // Lock the type field for NORMAL-only students
  useEffect(() => {
    if (isNormalOnly) setValue("internshipType", "NORMAL");
  }, [isNormalOnly, setValue]);

  const internshipType = watch("internshipType");

  const onSubmit = async (data: ProposalFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/topics/student-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          supportingDocUrl: data.supportingDocUrl || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");

      toast.success(t("toast.proposalSubmitted"));
      router.push("/student");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Submission failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          {t("topics.propose")}
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Found a company independently? Submit your topic and company details for admin approval.
          You will be directly assigned once approved — no open application needed.
        </p>
      </div>

      {/* Level info banner */}
      <div
        className={`flex items-start gap-3 p-4 rounded-lg border ${
          isNormalOnly
            ? "bg-amber-50 border-amber-200"
            : "bg-indigo-50 border-indigo-200"
        }`}
      >
        <Info
          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
            isNormalOnly ? "text-amber-600" : "text-indigo-600"
          }`}
        />
        <p className={`text-[12px] ${isNormalOnly ? "text-amber-800" : "text-indigo-800"}`}>
          {isNormalOnly
            ? `Your level (${studentLevel}) is eligible for Normal internships only.`
            : `Your level (${studentLevel}) is eligible for both PFE and Normal internships.`}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Topic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600" />
            {t("topics.title")}
          </h2>

          {/* Internship Type */}
          <div>
            <label className="admin-form-label">
              Internship Type <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-4 mt-1">
              {!isNormalOnly && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="PFE"
                    {...register("internshipType")}
                    className="accent-purple-600"
                  />
                  <span className="text-[13px] font-medium">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase mr-1">
                      PFE
                    </span>
                    Projet de Fin d&apos;Études
                  </span>
                </label>
              )}
              <label className={`flex items-center gap-2 ${isNormalOnly ? "" : "cursor-pointer"}`}>
                <input
                  type="radio"
                  value="NORMAL"
                  {...register("internshipType")}
                  className="accent-emerald-600"
                  disabled={isNormalOnly}
                />
                <span className="text-[13px] font-medium">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase mr-1">
                    Normal
                  </span>
                  Normal Internship
                </span>
              </label>
            </div>
            {errors.internshipType && (
              <p className="mt-1 text-[11px] text-red-600">{errors.internshipType.message}</p>
            )}
          </div>

          <Input
            label="Topic Title *"
            placeholder="e.g. Development of a real-time monitoring system"
            {...register("title")}
            error={errors.title?.message}
          />

          <div>
            <label className="admin-form-label">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register("description")}
              rows={4}
              className="admin-input h-auto py-2"
              placeholder="Describe the internship goals, context, and expected outcomes..."
            />
            {errors.description && (
              <p className="mt-1 text-[11px] text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="admin-form-label">Required Skills / Technologies</label>
            <textarea
              {...register("requiredSkills")}
              rows={2}
              className="admin-input h-auto py-2"
              placeholder="e.g. Python, React, REST APIs, Docker..."
            />
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" />
            Host Company Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Company Name *"
              placeholder="e.g. Sonatrach"
              {...register("companyName")}
              error={errors.companyName?.message}
            />
            <Input
              label="Industry Sector"
              placeholder="e.g. IT, Energy, Telecom"
              {...register("companySector")}
              error={errors.companySector?.message}
            />
            <Input
              label="Company Address"
              placeholder="Street address"
              {...register("companyAddress")}
              error={errors.companyAddress?.message}
            />
            <Input
              label="City / Wilaya"
              placeholder="e.g. Algiers"
              {...register("companyCity")}
              error={errors.companyCity?.message}
            />
          </div>
        </div>

        {/* Contact Person */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600" />
            Company Contact Person
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Mohamed Amine"
              {...register("contactPerson")}
              error={errors.contactPerson?.message}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="contact@company.dz"
              {...register("contactEmail")}
              error={errors.contactEmail?.message}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+213 xx xxx xxxx"
              {...register("contactPhone")}
              error={errors.contactPhone?.message}
            />
          </div>
        </div>

        {/* Supporting Document */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-600" />
            Supporting Document
          </h2>
          <p className="text-[12px] text-gray-500">
            If you have a company acceptance letter or any official document, upload it first via
            the document upload tool and paste the URL below.
          </p>
          <Input
            label="Document URL (optional)"
            placeholder="https://..."
            {...register("supportingDocUrl")}
            error={errors.supportingDocUrl?.message}
          />
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[13px] text-gray-500 hover:text-gray-700"
          >
            {t("common.cancel")}
          </button>
          <Button type="submit" isLoading={isLoading}>{t("topics.propose")}</Button>
        </div>
      </form>
    </div>
  );
}
