"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { topicSchema } from "@/lib/validations/topic.schema";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function NewTopicPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<any>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      type: "COMPANY_PROPOSED",
      maxStudents: 1,
      academicYear: "2024-2025", // will be overridden from settings
    }
  });

  useEffect(() => {
    const fetchYear = async () => {
      try {
        const res = await fetch("/api/settings/public");
        const data = await res.json();
        if (data.data?.currentAcademicYear) {
          reset((values: Record<string, unknown>) => ({ ...values, academicYear: data.data.currentAcademicYear }));
        }
      } catch { /* keep default */ }
    };
    fetchYear();
  }, [reset]);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success(t("toast.topicProposed"));
      router.push("/company/topics");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit topic");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-[800px] mx-auto space-y-6">
      <div className="flex items-center mb-6">
        <Link href="/company/topics" className="mr-4 text-gray-400 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("topics.propose")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("common.appSubtitle")}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-md overflow-hidden shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <Input
            label="Topic Title"
            placeholder="e.g. Design of an AI-powered detection system"
            {...register("title")}
            error={errors.title?.message as string}
          />

          <div className="w-full">
            <label className="admin-form-label">Full Description</label>
            <textarea
              {...register("description")}
              rows={6}
              className={`admin-input h-auto py-3 ${errors.description ? "border-red-500" : ""}`}
              placeholder="Describe the objectives, context, and expected outcome of the internship..."
            />
            {errors.description && <p className="admin-error">{errors.description.message as string}</p>}
          </div>

          <div className="w-full">
            <label className="admin-form-label">Required Skills & Technologies</label>
            <textarea
              {...register("requiredSkills")}
              rows={2}
              className="admin-input h-auto py-2"
              placeholder="e.g. React, Python, Machine Learning basics..."
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="w-full">
              <label className="admin-form-label">Maximum Students (1 or 2)</label>
              <select {...register("maxStudents", { valueAsNumber: true })} className="admin-input">
                <option value={1}>1 Student (Solo)</option>
                <option value={2}>2 Students (Binôme)</option>
              </select>
            </div>
            
            <div className="w-full">
              <label className="admin-form-label">Academic Year</label>
              <input 
                type="text" 
                {...register("academicYear")} 
                readOnly 
                className="admin-input bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200" 
              />
              <p className="text-[11px] text-gray-400 mt-1">Set automatically by system.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <Button type="button" variant="outline" className="mr-3" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Submit Proposal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
