"use client";

import React, { useState } from "react";
import { ArrowLeft, Mail, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";

type Step = "EMAIL" | "OTP" | "RESET" | "SUCCESS";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useTranslation();
  const [step, setStep] = useState<Step>("EMAIL");
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState("");
  const [passwords, setPasswords] = useState({ password: "", confirm: "" });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send code");
      setUserId(data.userId);
      toast.success(t("auth.emailSent"));
      setStep("OTP");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid code");
      toast.success(t("auth.verifyCode"));
      setStep("RESET");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.password !== passwords.confirm) {
      toast.error(t("errors.passwordMismatch"));
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code: otp, password: passwords.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setStep("SUCCESS");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative ${isRTL ? "rtl" : "ltr"}`}>

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

      {/* Back to login */}
      <div className={`fixed top-4 ${isRTL ? "right-4" : "left-4"} z-50`}>
        <Link href="/login"
          className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-indigo-600 font-semibold transition-all group px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm">
          <ArrowLeft className={`h-4 w-4 transition-transform group-hover:-translate-x-1 ${isRTL ? "rotate-180" : ""}`} />
          {t("auth.login").toUpperCase()}
        </Link>
      </div>

      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-md mx-auto mb-4 flex items-center justify-center shadow-sm">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-[17px] font-semibold text-gray-900 uppercase tracking-tight">{t("common.appName")}</h1>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mt-1">{t("auth.verifyCode")}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-8 shadow-sm">
          {/* STEP 1: Email */}
          {step === "EMAIL" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("auth.forgotPassword")}</h2>
                <p className="text-[13px] text-gray-500">{t("auth.enterEmail")}</p>
              </div>
              <Input
                label={t("common.email")}
                placeholder="e.g. name@esst-sup.dz"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t("auth.sendCode")}
              </Button>
            </form>
          )}

          {/* STEP 2: OTP */}
          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("auth.verifyCode")}</h2>
                <p className="text-[13px] text-gray-500">{t("auth.emailSent")} <strong>{email}</strong></p>
              </div>
              <Input
                label="6-Digit OTP"
                placeholder="000 000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                icon={ShieldCheck}
                className="text-center tracking-[0.5em] text-lg font-bold"
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t("auth.verifyCode")}
              </Button>
              <button type="button" onClick={() => setStep("EMAIL")}
                className="w-full text-[12px] text-gray-400 hover:text-indigo-600 transition-colors" disabled={isLoading}>
                {t("auth.sendCode")} →
              </button>
            </form>
          )}

          {/* STEP 3: New password */}
          {step === "RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold text-gray-900">{t("auth.resetPassword")}</h2>
                <p className="text-[13px] text-gray-500">{t("errors.passwordTooShort")}</p>
              </div>
              <div className="space-y-4">
                <Input label={t("auth.newPassword")} type="password" placeholder="••••••••"
                  value={passwords.password} onChange={(e) => setPasswords({ ...passwords, password: e.target.value })} required />
                <Input label={t("auth.confirmPassword")} type="password" placeholder="••••••••"
                  value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                {t("auth.resetPassword")}
              </Button>
            </form>
          )}

          {/* STEP 4: Success */}
          {step === "SUCCESS" && (
            <div className="text-center space-y-6 py-4 animate-in zoom-in-95">
              <div className="h-16 w-16 bg-green-50 text-green-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-[16px] font-semibold text-gray-900">{t("status.COMPLETED")}</h2>
                <p className="text-[13px] text-gray-500">{t("internship.reportSubmitted")}</p>
              </div>
              <Button onClick={() => router.push("/login")} className="w-full">
                {t("auth.login")}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-8 uppercase tracking-[0.2em] font-medium">
          Secure Identity Management Service
        </p>
      </div>
    </div>
  );
}
