"use client";

import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import {
  Building2, FileText, User, Upload, Info, Paperclip, X, Printer, Download,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const proposalSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  internshipType: z.enum(["PFE", "NORMAL"]),
  companyName: z.string().min(2, "Company name is required"),
  companySector: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  contactPerson: z.string().min(2, "Contact person name is required"),
  contactEmail: z.string().email("Invalid contact email"),
  contactPhone: z.string().optional(),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

export default function ProposeTopicPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formFilled, setFormFilled] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    defaultValues: { internshipType: isNormalOnly ? "NORMAL" : "PFE" },
  });

  useEffect(() => { if (isNormalOnly) setValue("internshipType", "NORMAL"); }, [isNormalOnly, setValue]);

  // Watch form to detect if enough fields are filled for print
  const watchedTitle = watch("title");
  const watchedCompany = watch("companyName");
  useEffect(() => {
    setFormFilled(!!(watchedTitle && watchedTitle.length >= 5 && watchedCompany && watchedCompany.length >= 2));
  }, [watchedTitle, watchedCompany]);

  // Fetch template URL from public settings
  useEffect(() => {
    fetch("/api/settings/public")
      .then((r) => r.json())
      .then((d) => setTemplateUrl(d.data?.proposalFormTemplateUrl || null))
      .catch(() => {});
  }, []);

  const internshipType = watch("internshipType");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5 MB"); return; }
    setDocFile(file);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload/supporting-doc", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocUrl(data.url);
      toast.success("Document uploaded");
    } catch (err: any) {
      console.error("Upload error details:", err);
      toast.error(err.message || "Upload failed");
      setDocFile(null);
    } finally {
      setUploading(false);
    }
  };

  const handlePrint = () => {
    const values = watch();
    const printContent = `
      <html><head><title>Internship Proposal Form</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
        .subtitle { text-align: center; color: #555; font-size: 13px; margin-bottom: 30px; }
        .section { margin-bottom: 20px; border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
        .section h2 { font-size: 13px; font-weight: bold; text-transform: uppercase; color: #4f46e5; margin: 0 0 12px; }
        .field { margin-bottom: 10px; }
        .field label { font-size: 11px; font-weight: bold; color: #555; text-transform: uppercase; display: block; margin-bottom: 2px; }
        .field p { font-size: 13px; margin: 0; padding: 6px 10px; border: 1px solid #e5e7eb; border-radius: 4px; min-height: 28px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .signature { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; }
        .sig-box { border-top: 1px solid #999; padding-top: 8px; text-align: center; font-size: 11px; color: #555; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>ESST — Internship Proposal Form</h1>
      <p class="subtitle">Academic Year ${new Date().getFullYear()}–${new Date().getFullYear() + 1} &nbsp;|&nbsp; Type: ${values.internshipType}</p>
      <div class="section">
        <h2>Topic Information</h2>
        <div class="field"><label>Title</label><p>${values.title || ''}</p></div>
        <div class="field"><label>Description</label><p>${values.description || ''}</p></div>
        <div class="field"><label>Required Skills / Technologies</label><p>${values.requiredSkills || '—'}</p></div>
      </div>
      <div class="section">
        <h2>Host Company</h2>
        <div class="grid">
          <div class="field"><label>Company Name</label><p>${values.companyName || ''}</p></div>
          <div class="field"><label>Industry Sector</label><p>${values.companySector || '—'}</p></div>
          <div class="field"><label>Address</label><p>${values.companyAddress || '—'}</p></div>
          <div class="field"><label>City / Wilaya</label><p>${values.companyCity || '—'}</p></div>
        </div>
      </div>
      <div class="section">
        <h2>Company Contact Person</h2>
        <div class="grid">
          <div class="field"><label>Full Name</label><p>${values.contactPerson || ''}</p></div>
          <div class="field"><label>Email</label><p>${values.contactEmail || ''}</p></div>
          <div class="field"><label>Phone</label><p>${values.contactPhone || '—'}</p></div>
        </div>
      </div>
      <div class="signature">
        <div class="sig-box">Student Signature<br/><br/><br/></div>
        <div class="sig-box">Company Stamp & Signature<br/><br/><br/></div>
        <div class="sig-box">Department Head<br/><br/><br/></div>
      </div>
      </body></html>`;
    const win = window.open("", "_blank");
    if (win) { win.document.write(printContent); win.document.close(); win.print(); }
  };

  const onSubmit = async (data: ProposalFormData) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/topics/student-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, supportingDocUrl: docUrl || undefined }),
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
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          {t("topics.propose")}
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
          {t("topics.proposePage.subtitle")}
        </p>
      </div>

      {/* Template download banner */}
      {templateUrl && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl transition-all">
          <Download className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-blue-800 dark:text-blue-300">{t("topics.proposePage.templateTitle")}</p>
            <p className="text-[12px] text-blue-600 dark:text-blue-400">{t("topics.proposePage.templateDesc")}</p>
          </div>
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-[12px] font-semibold rounded-lg transition-colors"
          >
            {t("topics.proposePage.download")}
          </a>
        </div>
      )}

      {/* Level info banner */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${isNormalOnly ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50" : "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50"}`}>
        <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isNormalOnly ? "text-amber-600 dark:text-amber-400" : "text-indigo-600 dark:text-indigo-400"}`} />
        <p className={`text-[12px] leading-relaxed ${isNormalOnly ? "text-amber-800 dark:text-amber-300" : "text-indigo-800 dark:text-indigo-300"}`}>
          {isNormalOnly
            ? t("topics.proposePage.eligibleNormal", { level: studentLevel })
            : t("topics.proposePage.eligibleBoth", { level: studentLevel })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Topic Information */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-all">
          <h2 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <FileText className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> {t("topics.proposePage.topicInfo")}
          </h2>

          <div>
            <label className="admin-form-label">{t("topics.proposePage.internshipType")} <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-4 mt-2">
              {!isNormalOnly && (
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input type="radio" value="PFE" {...register("internshipType")} className="accent-purple-600 h-4 w-4" />
                  <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800 uppercase mr-1">PFE</span>
                    {t("topics.proposePage.pfe")}
                  </span>
                </label>
              )}
              <label className={`flex items-center gap-2.5 ${isNormalOnly ? "opacity-70" : "cursor-pointer group"}`}>
                <input type="radio" value="NORMAL" {...register("internshipType")} className="accent-emerald-600 h-4 w-4" disabled={isNormalOnly} />
                <span className="text-[13px] font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600 transition-colors">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase mr-1">Normal</span>
                  {t("topics.proposePage.normal")}
                </span>
              </label>
            </div>
          </div>

          <Input label={t("topics.proposePage.titleLabel")} placeholder={t("topics.proposePage.titlePlaceholder")} {...register("title")} error={errors.title?.message} required />

          <div>
            <label className="admin-form-label">{t("topics.proposePage.descLabel")} <span className="text-red-500">*</span></label>
            <textarea {...register("description")} rows={5} className="admin-input h-auto py-2" placeholder={t("topics.proposePage.descPlaceholder")} />
            {errors.description && <p className="mt-1 text-[11px] text-red-600">{errors.description.message}</p>}
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-all">
          <h2 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> {t("topics.proposePage.companyInfo")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t("topics.proposePage.companyName")} placeholder="e.g. Sonatrach" {...register("companyName")} error={errors.companyName?.message} required />
            <Input label={t("topics.proposePage.companySector")} placeholder="e.g. IT, Energy, Telecom" {...register("companySector")} />
            <Input label={t("topics.proposePage.companyAddress")} placeholder="Street address" {...register("companyAddress")} />
            <Input label={t("topics.proposePage.companyCity")} placeholder="e.g. Algiers" {...register("companyCity")} />
          </div>
        </div>

        {/* Contact Person */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-5 transition-all">
          <h2 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> {t("topics.proposePage.contactInfo")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label={t("topics.proposePage.contactName")} placeholder="e.g. Mohamed Amine" {...register("contactPerson")} error={errors.contactPerson?.message} required />
            <Input label={t("topics.proposePage.contactEmail")} type="email" placeholder="contact@company.dz" {...register("contactEmail")} error={errors.contactEmail?.message} required />
            <Input label={t("topics.proposePage.contactPhone")} type="tel" placeholder="+213 xx xxx xxxx" {...register("contactPhone")} />
          </div>
        </div>

        {/* Supporting Document — file upload */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4 transition-all">
          <h2 className="text-[13px] font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> {t("topics.proposePage.supportingDoc")}
          </h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            {t("topics.proposePage.uploadDesc")}
          </p>

          {docFile ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-lg">
              <Paperclip className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="text-[13px] text-green-800 dark:text-green-300 font-medium flex-1 truncate">{docFile.name}</span>
              <button
                type="button"
                onClick={() => { setDocFile(null); setDocUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-green-500 hover:text-red-500 dark:text-green-400 dark:hover:text-red-400 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 dark:border-slate-700 rounded-xl text-[13px] text-gray-500 dark:text-gray-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all w-full justify-center"
            >
              {uploading ? (
                <><span className="animate-spin text-lg">⏳</span> {t("topics.proposePage.uploading")}</>
              ) : (
                <><Paperclip className="h-4 w-4" /> {t("topics.proposePage.clickToAttach")}</>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Print button — shows when form is sufficiently filled */}
        {formFilled && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl transition-all">
            <Printer className="h-5 w-5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">{t("topics.proposePage.readyToPrint")}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("topics.proposePage.printDesc")}</p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-gray-800 dark:bg-slate-700 text-white text-[12px] font-semibold rounded-lg hover:bg-gray-900 dark:hover:bg-slate-600 transition-colors shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" /> {t("topics.proposePage.printButton")}
            </button>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-slate-800">
          <button type="button" onClick={() => router.back()} className="text-[13px] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
            {t("common.cancel")}
          </button>
          <Button type="submit" isLoading={isLoading} className="px-8 shadow-lg shadow-indigo-200 dark:shadow-none">{t("topics.propose")}</Button>
        </div>
      </form>
    </div>
  );
}
