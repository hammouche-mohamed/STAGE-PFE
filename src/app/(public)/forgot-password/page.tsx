"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ShieldCheck, ArrowLeft, Mail, Lock, Key } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import { ThemeToggle } from "@/components/ThemeToggle";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const codeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

const passwordSchema = z.object({
  password: z.string()
    .min(12, "Password must be at least 12 characters")
    .regex(/[0-9]/, "Password must include at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"EMAIL" | "CODE" | "PASSWORD">("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const router = useRouter();
  const { t, language, setLanguage, isRTL } = useTranslation();

  const emailForm = useForm({ resolver: zodResolver(emailSchema) });
  const codeForm = useForm({ resolver: zodResolver(codeSchema) });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema) });

  const startResendTimer = () => {
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendCode = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          emailForm.setError("email", { type: "manual", message: t("auth.emailNotFound") });
          setIsLoading(false);
          return;
        }
        throw new Error(result.error || "Failed to send code");
      }
      setEmail(data.email);
      setStep("CODE");
      toast.success(t("auth.emailSent") || "Verification code sent!");
      startResendTimer();
    } catch (error: any) {
      toast.error(error.message || t("errors.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: data.code }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setCode(data.code);
      setStep("PASSWORD");
      toast.success("Code verified!");
    } catch (error: any) {
      toast.error(error.message || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (data: any) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword: data.password }),
      });
      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || "Failed to reset password.");
      }
      toast.success("Password reset successfully!");
      router.push("/login");
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={"h-[100dvh] w-full flex relative overflow-hidden " + (isRTL ? "rtl" : "ltr")}>
      {/* Background Image - Fixed on mobile, Left side on desktop */}
      <div className="fixed inset-0 lg:relative lg:w-1/2 bg-gray-900 z-0">
        <div className="absolute inset-0 bg-indigo-950/80 z-10" />
        <Image 
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=1200&q=80" 
          alt="University Campus" 
          fill
          className="object-cover"
          sizes="100vw"
          unoptimized
          priority
        />
        <div className="hidden lg:flex absolute inset-0 z-20 flex-col justify-end p-12 text-white">
          <div className="mb-8">
            <div className="h-14 w-14 bg-white rounded-lg flex items-center justify-center mb-6 shadow-xl">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-4xl font-bold mb-4 tracking-tight text-white drop-shadow-lg">{t("auth.accountRecovery")}</h2>
            <p className="text-lg text-white/90 max-w-md leading-relaxed drop-shadow-md">
              {t("auth.accountRecoveryDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-12 lg:bg-white dark:lg:bg-slate-950 transition-colors duration-300 relative z-10 min-h-screen">
        {/* Language switcher & Theme Toggle */}
        <div className="absolute top-6 left-6 z-50">
          <ThemeToggle />
        </div>

        <div className={`absolute top-6 ${isRTL ? "left-16" : "right-6"} z-50 flex items-center gap-3`}>
          <div className="flex items-center bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-0.5 gap-0.5 shadow-sm">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => setLanguage(code)}
                className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
                  ${language === code ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[460px] relative z-10 my-auto">
          <div className="text-center mb-8 lg:hidden">
            <div className="h-14 w-14 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center shadow-xl">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-[20px] font-bold text-white uppercase tracking-tight drop-shadow-md">{t("common.appSubtitle")}</h1>
            <p className="text-[12px] text-white/80 uppercase tracking-widest font-medium mt-1 drop-shadow-sm">{t("auth.resetPassword")}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl lg:rounded-md p-8 shadow-2xl lg:shadow-sm transition-colors duration-300">
          {step === "EMAIL" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{t("auth.forgotPassword")}</h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{t("auth.enterEmailCodeDesc")}</p>
              </div>
              <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4">
                <Input
                  label={t("common.email")}
                  type="email"
                  placeholder="e.g. yourname@example.com"
                  {...emailForm.register("email")}
                  error={emailForm.formState.errors.email?.message as string}
                  icon={Mail}
                  required
                />
                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  {t("auth.sendCode")}
                </Button>
              </form>
            </div>
          )}

          {step === "CODE" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{t("auth.checkYourEmail")}</h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{t("auth.codeSentDesc")} <span className="font-semibold text-gray-900 dark:text-white">{email}</span></p>
              </div>
              <form onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-4">
                <Input
                  label={t("auth.verificationCode")}
                  type="text"
                  placeholder="000000"
                  maxLength={6}
                  {...codeForm.register("code")}
                  error={codeForm.formState.errors.code?.message as string}
                  icon={Key}
                  className="text-center tracking-[10px] font-bold text-xl"
                  required
                />
                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  {t("auth.verifyCode")}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => handleSendCode({ email })}
                    disabled={resendTimer > 0 || isLoading}
                    className="text-[12px] text-indigo-600 font-medium hover:underline disabled:text-gray-400"
                  >
                    {resendTimer > 0 ? `${t("auth.resendCodeIn")} ${resendTimer}s` : t("auth.resendCode")}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === "PASSWORD" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900 dark:text-white">{t("auth.newPassword")}</h2>
                <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{t("auth.enterNewPasswordDesc")}</p>
              </div>
              <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <Input
                  label={t("auth.newPassword")}
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("password")}
                  error={passwordForm.formState.errors.password?.message as string}
                  icon={Lock}
                  required
                />
                <Input
                  label={t("auth.confirmPassword")}
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("confirmPassword")}
                  error={passwordForm.formState.errors.confirmPassword?.message as string}
                  icon={Lock}
                  required
                />
                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  {t("auth.resetPassword")}
                </Button>
              </form>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors"
            >
              <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              {t("auth.backToLogin")}
            </Link>
          </div>
        </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-8 left-0 w-full text-center hidden lg:block">
          <p className="text-[12px] text-gray-400 font-medium">
            © {new Date().getFullYear()} ESST. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
