"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, RegistrationInput } from "@/lib/validations/registration.schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

export default function RegisterPage() {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [emailStatus, setEmailStatus] = useState<{
    type: "idle" | "checking" | "pending" | "exists" | "rejected";
    message?: string;
  }>({ type: "idle" });
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { role: "STUDENT" },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => {
        if (d.data?.currentAcademicYear) setValue("academicYear", d.data.currentAcademicYear);
        if (d.data?.availableSpecialities) {
          setSpecialities(d.data.availableSpecialities.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean));
        }
      })
      .catch(() => {});
  }, [setValue]);

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (!email || errors.email) { setEmailStatus({ type: "idle" }); return; }
    setEmailStatus({ type: "checking" });
    try {
      const res = await fetch(`/api/registrations/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.status === "PENDING_REQUEST") setEmailStatus({ type: "pending", message: data.message });
      else if (data.status === "ACCOUNT_EXISTS") setEmailStatus({ type: "exists", message: data.message });
      else if (data.status === "REJECTED_REQUEST") setEmailStatus({ type: "rejected", message: data.message });
      else setEmailStatus({ type: "idle" });
    } catch { setEmailStatus({ type: "idle" }); }
  };

  const onSubmit = async (data: RegistrationInput) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Submission failed");
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Language switcher */}
      <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 flex items-center bg-white border border-gray-200 rounded-full p-0.5 gap-0.5 shadow-sm`}>
        {LANGS.map(({ code, label }) => (
          <button key={code} onClick={() => setLanguage(code)}
            className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
              ${language === code ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[800px] bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-100">
          <h1 className="text-[17px] font-semibold text-gray-900">{t("auth.register")}</h1>
          <p className="text-[13px] text-gray-500 mt-1">{t("errors.unauthorized")}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Input label={t("common.name")} placeholder="e.g. Salim Amghar" {...register("name")} error={errors.name?.message} />

            <div className="w-full">
              <Input
                label={t("common.email")} type="email" placeholder="e.g. salim@example.com"
                {...register("email")}
                onBlur={(e) => { register("email").onBlur(e); handleEmailBlur(e); }}
                error={errors.email?.message}
              />
              {emailStatus.type === "checking" && <p className="mt-1 text-[11px] text-gray-400">{t("common.loading")}</p>}
              {emailStatus.type === "pending" && <p className="mt-1 text-[11px] text-indigo-600 font-medium">{emailStatus.message}</p>}
              {emailStatus.type === "exists" && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {emailStatus.message} <Link href="/login" className="underline font-bold">{t("auth.login")}</Link>
                </p>
              )}
              {emailStatus.type === "rejected" && <p className="mt-1 text-[11px] text-orange-600 font-medium">{emailStatus.message}</p>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 col-span-1 lg:col-span-2">
              <div className="w-full">
                <label className="admin-form-label">{t("common.role")}</label>
                <select {...register("role")} className="admin-input cursor-pointer">
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher Supervisor</option>
                  <option value="COMPANY">Company</option>
                </select>
              </div>

              {selectedRole === "STUDENT" && (
                <Input label="Student ID (Matricule)" placeholder="e.g. 21213500..." {...register("studentId")} error={errors.studentId?.message} />
              )}
            </div>

            <Input label={t("auth.newPassword")} type="password" placeholder="••••••••" {...register("password")} error={errors.password?.message} />
            <Input label={t("auth.confirmPassword")} type="password" placeholder="••••••••" {...register("confirmPassword")} error={errors.confirmPassword?.message} />

            {selectedRole === "STUDENT" && (
              <>
                <div className="w-full">
                  <label className="admin-form-label">Academic Level <span className="text-red-500">*</span></label>
                  <select {...register("level")} className="admin-input cursor-pointer">
                    <option value="">Select Level</option>
                    <option value="L1">L1</option><option value="L2">L2</option>
                    <option value="L3">L3 (PFE eligible)</option>
                    <option value="M1">M1</option><option value="M2">M2 (PFE eligible)</option>
                  </select>
                  {errors.level && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.level.message}</p>}
                </div>
                <div className="w-full">
                  <label className="admin-form-label">Speciality</label>
                  <select {...register("speciality")} className="admin-input cursor-pointer">
                    <option value="">Select Speciality</option>
                    {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                    {specialities.length === 0 && <option value="Computer Science">Computer Science</option>}
                  </select>
                  {errors.speciality && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.speciality.message}</p>}
                </div>
                <Input label="Academic Year" readOnly className="bg-gray-50 cursor-not-allowed" {...register("academicYear")} error={errors.academicYear?.message} />
              </>
            )}

            {selectedRole === "TEACHER" && (
              <div className="w-full col-span-1 lg:col-span-2">
                <label className="admin-form-label">Speciality</label>
                <select {...register("speciality")} className="admin-input cursor-pointer">
                  <option value="">Select Speciality</option>
                  {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                  {specialities.length === 0 && <option value="Computer Science">Computer Science</option>}
                </select>
                {errors.speciality && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.speciality.message}</p>}
              </div>
            )}

            {selectedRole === "COMPANY" && (
              <>
                <Input label="Company Name" placeholder="e.g. Sonatrach" {...register("companyName")} error={errors.companyName?.message} />
                <Input label="Industry Sector" placeholder="e.g. Energy, IT" {...register("sector")} error={errors.sector?.message} />
                <Input label="Wilaya" placeholder="e.g. Algiers" {...register("wilaya")} error={errors.wilaya?.message} />
              </>
            )}
          </div>

          <div className="w-full">
            <label className="admin-form-label">Motivation <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
            <textarea {...register("motivation")} rows={3} className="admin-input h-auto py-2" placeholder="Describe your project or reason for joining..." />
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-gray-100">
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
              <Link href="/login" className="text-[13px] text-indigo-600 hover:text-indigo-700 font-medium text-center sm:text-left">
                {t("auth.login")} →
              </Link>
              <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto">
                {t("common.submit")}
              </Button>
            </div>
            <Link href="/" className={`flex items-center justify-center gap-2 w-full py-2 text-[13px] text-gray-400 hover:text-indigo-600 font-medium transition-colors border-t border-gray-50 mt-2`}>
              <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              {t("common.back")}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
