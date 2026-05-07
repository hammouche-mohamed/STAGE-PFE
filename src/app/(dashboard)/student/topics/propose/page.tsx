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
  requiredSkills: z.string().optional(),
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
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
          <FileText className="h-5 w-5 text-indigo-600" />
          {t("topics.propose")}
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Found a company independently? Submit your topic and company details for admin approval.
        </p>
      </div>

      {/* Template download banner */}
      {templateUrl && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Download className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-blue-800">Official Proposal Form Template Available</p>
            <p className="text-[12px] text-blue-600">Download the official form, fill it in, sign it and bring it to the department.</p>
          </div>
          <a
            href={templateUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 bg-blue-600 text-white text-[12px] font-semibold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download
          </a>
        </div>
      )}

      {/* Level info banner */}
      <div className={`flex items-start gap-3 p-4 rounded-lg border ${isNormalOnly ? "bg-amber-50 border-amber-200" : "bg-indigo-50 border-indigo-200"}`}>
        <Info className={`h-4 w-4 mt-0.5 flex-shrink-0 ${isNormalOnly ? "text-amber-600" : "text-indigo-600"}`} />
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
            <FileText className="h-4 w-4 text-indigo-600" /> Topic Information
          </h2>

          <div>
            <label className="admin-form-label">Internship Type <span className="text-red-500">*</span></label>
            <div className="flex gap-4 mt-1">
              {!isNormalOnly && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" value="PFE" {...register("internshipType")} className="accent-purple-600" />
                  <span className="text-[13px] font-medium">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200 uppercase mr-1">PFE</span>
                    Projet de Fin d&apos;Études
                  </span>
                </label>
              )}
              <label className={`flex items-center gap-2 ${isNormalOnly ? "" : "cursor-pointer"}`}>
                <input type="radio" value="NORMAL" {...register("internshipType")} className="accent-emerald-600" disabled={isNormalOnly} />
                <span className="text-[13px] font-medium">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase mr-1">Normal</span>
                  Normal Internship
                </span>
              </label>
            </div>
          </div>

          <Input label="Topic Title *" placeholder="e.g. Development of a real-time monitoring system" {...register("title")} error={errors.title?.message} />

          <div>
            <label className="admin-form-label">Description <span className="text-red-500">*</span></label>
            <textarea {...register("description")} rows={4} className="admin-input h-auto py-2" placeholder="Describe the internship goals, context, and expected outcomes..." />
            {errors.description && <p className="mt-1 text-[11px] text-red-600">{errors.description.message}</p>}
          </div>

          <div>
            <label className="admin-form-label">Required Skills / Technologies</label>
            <textarea {...register("requiredSkills")} rows={2} className="admin-input h-auto py-2" placeholder="e.g. Python, React, REST APIs, Docker..." />
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="h-4 w-4 text-indigo-600" /> Host Company Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Company Name *" placeholder="e.g. Sonatrach" {...register("companyName")} error={errors.companyName?.message} />
            <Input label="Industry Sector" placeholder="e.g. IT, Energy, Telecom" {...register("companySector")} />
            <Input label="Company Address" placeholder="Street address" {...register("companyAddress")} />
            <Input label="City / Wilaya" placeholder="e.g. Algiers" {...register("companyCity")} />
          </div>
        </div>

        {/* Contact Person */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-4">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <User className="h-4 w-4 text-indigo-600" /> Company Contact Person
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Full Name *" placeholder="e.g. Mohamed Amine" {...register("contactPerson")} error={errors.contactPerson?.message} />
            <Input label="Email *" type="email" placeholder="contact@company.dz" {...register("contactEmail")} error={errors.contactEmail?.message} />
            <Input label="Phone" type="tel" placeholder="+213 xx xxx xxxx" {...register("contactPhone")} />
          </div>
        </div>

        {/* Supporting Document — file upload */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-600" /> Supporting Document
          </h2>
          <p className="text-[12px] text-gray-500">
            Upload a company acceptance letter or any official document (PDF, DOCX, JPG — max 5 MB).
          </p>

          {docFile ? (
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Paperclip className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-[13px] text-green-800 font-medium flex-1 truncate">{docFile.name}</span>
              <button
                type="button"
                onClick={() => { setDocFile(null); setDocUrl(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="text-green-500 hover:text-red-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-[13px] text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all w-full justify-center"
            >
              {uploading ? (
                <><span className="animate-spin text-lg">⏳</span> Uploading…</>
              ) : (
                <><Paperclip className="h-4 w-4" /> Click to attach a document</>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleFileSelect} />
        </div>

        {/* Print button — shows when form is sufficiently filled */}
        {formFilled && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <Printer className="h-5 w-5 text-gray-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-gray-700">Ready to print?</p>
              <p className="text-[12px] text-gray-500">Generate a printable summary to sign offline at the department.</p>
            </div>
            <button
              type="button"
              onClick={handlePrint}
              className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-gray-800 text-white text-[12px] font-semibold rounded-lg hover:bg-gray-900 transition-colors"
            >
              <Printer className="h-3.5 w-3.5" /> Print Form
            </button>
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <button type="button" onClick={() => router.back()} className="text-[13px] text-gray-500 hover:text-gray-700">
            {t("common.cancel")}
          </button>
          <Button type="submit" isLoading={isLoading}>{t("topics.propose")}</Button>
        </div>
      </form>
    </div>
  );
}
