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
      academicYear: "N/A", // will be overridden from settings
    }
  });

  const [filieres, setFilieres] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsRes, filieresRes] = await Promise.all([
          fetch("/api/settings/public"),
          fetch("/api/filieres")
        ]);
        const settingsData = await settingsRes.json();
        const filieresData = await filieresRes.json();
        
        if (settingsData.data?.currentAcademicYear) {
          reset((values: Record<string, unknown>) => ({ ...values, academicYear: settingsData.data.currentAcademicYear }));
        }
        setFilieres(filieresData.data || []);
      } catch { /* keep default */ }
    };
    fetchData();
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
        <Link href="/company/topics" className="mr-4 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("topics.propose")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("common.appSubtitle")}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md overflow-hidden shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <Input
            label="Topic Title"
            placeholder="e.g. Design of an AI-powered detection system"
            {...register("title")}
            error={errors.title?.message as string}
            required
          />

          <div className="w-full">
            <label className="admin-form-label dark:text-gray-300">Full Description <span className="text-red-500">*</span></label>
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

          <div className="w-full">
            <label className="admin-form-label dark:text-gray-300">Target Department (Filière) <span className="text-red-500">*</span></label>
            <select 
              {...register("filiereId")} 
              className={`admin-input dark:bg-slate-800 dark:border-slate-700 dark:text-white ${errors.filiereId ? "border-red-500" : ""}`}
            >
              <option value="">Select a department...</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.name}{f.code ? ` (${f.code})` : ""}</option>
              ))}
            </select>
            {errors.filiereId && <p className="admin-error">{errors.filiereId.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="w-full">
              <label className="admin-form-label dark:text-gray-300">Maximum Students</label>
              <Input
                type="number"
                min={1}
                max={10}
                {...register("maxStudents", { valueAsNumber: true })}
                error={errors.maxStudents?.message as string}
                placeholder="1"
              />
            </div>
            
            <div className="w-full">
              <label className="admin-form-label dark:text-gray-300">Academic Year</label>
              <input 
                type="text" 
                {...register("academicYear")} 
                readOnly 
                className="admin-input bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed border-gray-200 dark:border-slate-700" 
              />
              <p className="text-[11px] text-gray-400 mt-1">Set automatically by system.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-end">
            <Button type="button" variant="outline" className="mr-3 dark:border-slate-700 dark:text-gray-300" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
              Submit Proposal
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
