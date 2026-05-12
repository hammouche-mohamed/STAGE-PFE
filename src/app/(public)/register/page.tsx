"use client";

import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registrationSchema, RegistrationInput } from "@/lib/validations/registration.schema";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import { Modal } from "@/components/ui/Modal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useRouter } from "next/navigation";
import Image from "next/image";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

export default function RegisterPage() {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [academicLevels, setAcademicLevels] = useState<string[]>([]);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState("");
  const [isClosedModalOpen, setIsClosedModalOpen] = useState(false);
  const router = useRouter();
  const [emailStatus, setEmailStatus] = useState<{
    type: "idle" | "checking" | "pending" | "exists" | "rejected";
    message?: string;
  }>({ type: "idle" });
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm<RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { role: "STUDENT", academicYear: "N/A" },
  });

  const selectedRole = watch("role");

  useEffect(() => {
    if (Object.keys(errors).length > 0) {

      toast.error("Please fill all required fields correctly.");
    }
  }, [errors]);

  useEffect(() => {
    fetch("/api/settings/public", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (d.data?.registrationOpen === "false") {
          setIsClosedModalOpen(true);
        }
        setValue("academicYear", d.data?.currentAcademicYear || "N/A");
        if (d.data?.filieres && d.data.filieres.length > 0) {
          setSpecialities(d.data.filieres.map((f: any) => f.name));
        } else if (d.data?.availableSpecialities) {
          setSpecialities(d.data.availableSpecialities.split(",").map((s: string) => s.trim()).filter(Boolean));
        }
        if (d.data?.availablePromotions) {
          const levels = d.data.availablePromotions.split(",").map((s: string) => s.trim()).filter(Boolean);
          setAcademicLevels(levels);
          if (levels.length > 0) {
            setValue("level", levels[0]);
            setValue("promotion", levels[0]);
          }
        }
      })
      .catch(() => { });
  }, [setValue]);

  const handleEmailBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const email = e.target.value;
    if (!email || errors.email || isLoading) { setEmailStatus({ type: "idle" }); return; }
    setEmailStatus({ type: "checking" });
    try {
      const res = await fetch(`/api/registrations/check-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.status === "PENDING_REQUEST") {
        setEmailStatus({ type: "pending", message: data.message });
        setModalEmail(email);
        setIsStatusModalOpen(true);
      }
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


      if (!res.ok) {
        if (result.status === "PENDING_REQUEST") {

          setModalEmail(data.email);
          setIsStatusModalOpen(true);
          return;
        }
        throw new Error(result.error || "Submission failed");
      }


      toast.success(t("auth.requestUnderReview"));
      setModalEmail(data.email);
      setIsStatusModalOpen(true);
    } catch (error: any) {
      console.error("Submission error:", error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={"min-h-screen w-full flex relative " + (isRTL ? "rtl" : "ltr")}>
      {/* Background Image - Fixed/Sticky on desktop to prevent zoom from long form */}
      <div className="fixed inset-0 lg:sticky lg:top-0 lg:h-screen lg:w-1/2 bg-gray-900 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-indigo-950/80 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1600&q=80"
          alt="University Campus"
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
          priority
        />
        <div className="hidden lg:flex absolute inset-0 z-20 flex-col justify-end p-12 text-white">
          <div className="mb-8">
            <h2 className="text-4xl font-bold mb-4 tracking-tight text-white drop-shadow-lg">Begin Your Journey</h2>
            <p className="text-lg text-white/90 max-w-md leading-relaxed drop-shadow-md">
              Create an account to submit your registration request. Whether you are a student, teacher, or company, the ESST portal streamlines your experience.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-12 lg:bg-gray-50 dark:lg:bg-slate-950 relative z-10 min-h-screen lg:bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:lg:bg-[radial-gradient(#1e293b_1px,transparent_1px)] lg:[background-size:20px_20px] transition-colors duration-300">
        {/* Language switcher & Theme Toggle */}
        <div className="absolute top-6 left-6 z-50">
          <ThemeToggle />
        </div>

        <div className={`absolute top-6 ${isRTL ? "left-16" : "right-6"} z-50 flex items-center gap-3`}>
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-0.5 gap-0.5 shadow-sm">
            {LANGS.map(({ code, label }) => (
              <button key={code} onClick={() => setLanguage(code)}
                className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
                  ${language === code ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[600px] mx-auto relative z-10 mt-16 lg:mt-0">
          <div className="text-center mb-6 lg:hidden">
            <h1 className="text-[20px] font-bold text-gray-900 dark:text-white uppercase tracking-tight drop-shadow-md">ESST Portal</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-medium mt-1 drop-shadow-sm">{t("common.appSubtitle")}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl lg:rounded-md shadow-2xl lg:shadow-sm overflow-hidden transition-colors duration-300">
            <div className="px-6 lg:px-8 py-6 border-b border-gray-100 dark:border-slate-800">
              <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("auth.register")}</h1>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{t("errors.unauthorized")}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 lg:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input 
                  label={selectedRole === "COMPANY" ? "Director's Full Name" : t("common.fullName")} 
                  placeholder={selectedRole === "COMPANY" ? "e.g. John Doe (Director)" : "e.g. Salim Amghar"} 
                  {...register("name")} 
                  error={errors.name?.message} 
                  required 
                />

                <div className="w-full">
                  <Input
                    label={t("common.email")} type="email" placeholder="yourname@example.com"
                    {...register("email")}
                    onBlur={(e) => { register("email").onBlur(e); handleEmailBlur(e); }}
                    error={errors.email?.message}
                    required
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-1 md:col-span-2">
                  <div className="w-full">
                    <label className="admin-form-label">{t("common.role")} <span className="text-red-500">*</span></label>
                    <select {...register("role")} className="admin-input cursor-pointer">
                      <option value="STUDENT">Student</option>
                      <option value="TEACHER">Teacher Supervisor</option>
                      <option value="COMPANY">Company</option>
                    </select>
                  </div>

                  {selectedRole === "STUDENT" && (
                    <Input label="Student ID (Matricule)" placeholder="e.g. 21213500..." {...register("studentId")} error={errors.studentId?.message} required />
                  )}
                </div>

                <div className="w-full">
                  <Input
                    label={t("auth.newPassword")}
                    type="password"
                    placeholder="••••••••"
                    {...register("password")}
                    error={errors.password?.message}
                    required
                  />
                </div>
                <Input label={t("auth.confirmPassword")} type="password" placeholder="••••••••" {...register("confirmPassword")} error={errors.confirmPassword?.message} required />

                {selectedRole === "STUDENT" && (
                  <>
                    <div className="w-full">
                      <label className="admin-form-label">Academic Level <span className="text-red-500">*</span></label>
                      <select 
                        {...register("level")} 
                        className="admin-input cursor-pointer"
                        onChange={(e) => {
                          register("level").onChange(e);
                          setValue("promotion", e.target.value);
                        }}
                      >
                        <option value="">Select Level</option>
                        {academicLevels.map(lvl => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                      {errors.level && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.level.message}</p>}
                    </div>
                    <div className="w-full">
                      <label className="admin-form-label">Speciality <span className="text-red-500">*</span></label>
                      <select {...register("speciality")} className="admin-input cursor-pointer">
                        <option value="">Select Speciality</option>
                        {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.speciality && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.speciality.message}</p>}
                    </div>
                    <Input
                      label="Academic Year"
                      readOnly
                      className={`bg-gray-50 dark:bg-slate-800 cursor-not-allowed ${watch("academicYear") === "N/A" ? "text-gray-400 font-normal" : "text-gray-900 dark:text-white font-medium"}`}
                      {...register("academicYear")}
                      error={errors.academicYear?.message}
                    />
                  </>
                )}

                {selectedRole === "TEACHER" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-1 md:col-span-2">
                    <div className="w-full">
                      <label className="admin-form-label">Speciality <span className="text-red-500">*</span></label>
                      <select {...register("speciality")} className="admin-input cursor-pointer">
                        <option value="">Select Speciality</option>
                        {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      {errors.speciality && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.speciality.message}</p>}
                    </div>
                    <div className="w-full">
                      <label className="admin-form-label">Grade (Academic Title) <span className="text-red-500">*</span></label>
                      <select {...register("grade")} className="admin-input cursor-pointer">
                        <option value="">Select Grade</option>
                        <option value="MCA">MCA</option>
                        <option value="MAA">MAA</option>
                        <option value="MCB">MCB</option>
                      </select>
                      {errors.grade && <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.grade.message}</p>}
                    </div>
                  </div>
                )}
                {selectedRole === "COMPANY" && (
                  <>
                    <Input label="Company Name" placeholder="e.g. Sonatrach" {...register("companyName")} error={errors.companyName?.message} required />
                    <Input label="Industry Sector" placeholder="e.g. Energy, IT" {...register("sector")} error={errors.sector?.message} required />
                    <Input label="Wilaya" placeholder="e.g. Algiers" {...register("wilaya")} error={errors.wilaya?.message} required />
                  </>
                )}
              </div>

              <div className="w-full">
                <label className="admin-form-label">Motivation <span className="text-gray-400 font-normal ml-1">(Optional)</span></label>
                <textarea {...register("motivation")} rows={3} className="admin-input h-auto py-2" placeholder="Describe your project or reason for joining..." />
              </div>

              <div className="flex flex-col gap-4 pt-4 border-t border-gray-100 dark:border-slate-800">
                <div className={`flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-4 ${isRTL ? "sm:flex-row-reverse" : ""}`}>
                  <div className="text-center sm:text-left text-[13px] text-gray-500 dark:text-gray-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
                      {t("auth.login")}
                    </Link>
                  </div>
                  <Button type="submit" isLoading={isLoading} className="w-full sm:w-auto" size="lg">
                    {t("common.submit")}
                  </Button>
                </div>
                <Link href="/" className={`flex items-center justify-center gap-2 w-full py-2 text-[13px] text-gray-400 hover:text-indigo-600 font-medium transition-colors border-t border-gray-50 dark:border-slate-800 mt-2`}>
                  <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                  {t("common.back")}
                </Link>
              </div>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 w-full text-center hidden lg:block">
          <p className="text-[12px] text-gray-400 font-medium">
            © {new Date().getFullYear()} ESST. All rights reserved.
          </p>
        </div>
      </div>

      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={t("auth.registrationStatus")}
        size="sm"
        footer={<Button onClick={() => router.push("/")} className="w-full">{t("common.back")}</Button>}
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full flex items-center justify-center mb-6">
            <Clock className="h-8 w-8 animate-pulse" />
          </div>
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">{t("auth.requestUnderReview")}</h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            {t("auth.requestReviewDesc")}
          </p>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-md p-4 w-full">
            <p className="text-[12px] text-indigo-700 dark:text-indigo-300 font-medium">
              {t("auth.emailNotificationNote", { email: modalEmail || "your email" })}
            </p>
          </div>
        </div>
      </Modal>
      <Modal
        isOpen={isClosedModalOpen}
        onClose={() => router.push("/")}
        title={t("auth.portalClosed")}
        size="sm"
        footer={<Button onClick={() => router.push("/")} className="w-full">{t("common.back")}</Button>}
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-[18px] font-bold text-gray-900 dark:text-white mb-2">{t("auth.portalClosed")}</h3>
          <p className="text-[14px] text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
            {t("auth.portalClosedDesc")}
          </p>
        </div>
      </Modal>
    </div>
  );
}
