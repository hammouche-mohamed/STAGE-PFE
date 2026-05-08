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
import { ShieldCheck, ArrowLeft, Mail, Lock, Key } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const codeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

const passwordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
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
  const { t, isRTL } = useTranslation();

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
      if (!res.ok) throw new Error();
      setEmail(data.email);
      setStep("CODE");
      toast.success("Verification code sent!");
      startResendTimer();
    } catch {
      toast.error("Failed to send code. Please try again.");
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
      if (!res.ok) throw new Error();
      toast.success("Password reset successfully!");
      router.push("/login");
    } catch {
      toast.error("Failed to reset password.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 ${isRTL ? "rtl" : "ltr"}`}>
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-md mx-auto mb-4 flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[17px] font-semibold text-gray-900 uppercase tracking-tight">ESST</h1>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mt-1">Reset Your Password</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
          {step === "EMAIL" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">Forgot Password?</h2>
                <p className="text-[13px] text-gray-500 mt-1">Enter your email and we'll send you a 6-digit code.</p>
              </div>
              <form onSubmit={emailForm.handleSubmit(handleSendCode)} className="space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. yourname@example.com"
                  {...emailForm.register("email")}
                  error={emailForm.formState.errors.email?.message as string}
                  icon={Mail}
                  required
                />
                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  Send Verification Code
                </Button>
              </form>
            </div>
          )}

          {step === "CODE" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">Check Your Email</h2>
                <p className="text-[13px] text-gray-500 mt-1">We sent a 6-digit code to <span className="font-semibold text-gray-900">{email}</span></p>
              </div>
              <form onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-4">
                <Input
                  label="Verification Code"
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
                  Verify Code
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => handleSendCode({ email })}
                    disabled={resendTimer > 0 || isLoading}
                    className="text-[12px] text-indigo-600 font-medium hover:underline disabled:text-gray-400"
                  >
                    {resendTimer > 0 ? `Resend code in ${resendTimer}s` : "Resend Verification Code"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {step === "PASSWORD" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div>
                <h2 className="text-[16px] font-bold text-gray-900">New Password</h2>
                <p className="text-[13px] text-gray-500 mt-1">Please enter your new password below.</p>
              </div>
              <form onSubmit={passwordForm.handleSubmit(handleResetPassword)} className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("password")}
                  error={passwordForm.formState.errors.password?.message as string}
                  icon={Lock}
                  required
                />
                <Input
                  label="Confirm Password"
                  type="password"
                  placeholder="••••••••"
                  {...passwordForm.register("confirmPassword")}
                  error={passwordForm.formState.errors.confirmPassword?.message as string}
                  icon={Lock}
                  required
                />
                <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
                  Update Password
                </Button>
              </form>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-[13px] text-gray-500 hover:text-indigo-600 font-medium transition-colors"
            >
              <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
