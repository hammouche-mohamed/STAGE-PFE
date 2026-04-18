"use client";

import React, { useState } from "react";
import { ArrowLeft, Mail, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Step = "EMAIL" | "OTP" | "RESET" | "SUCCESS";

export default function ForgotPasswordPage() {
  const router = useRouter();
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
      toast.success("Verification code sent to your email");
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
      
      toast.success("Code verified successfully");
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
      toast.error("Passwords do not match");
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">
      <div className="fixed top-8 left-8 z-50">
        <Link 
          href="/login" 
          className="flex items-center gap-2 text-[12px] text-gray-500 hover:text-indigo-600 font-semibold transition-all group px-4 py-2 bg-white border border-gray-200 rounded-full shadow-sm"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          BACK TO LOGIN
        </Link>
      </div>

      <div className="w-full max-w-[420px]">
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-md mx-auto mb-4 flex items-center justify-center shadow-sm">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-[17px] font-semibold text-gray-900 uppercase tracking-tight">Recover Account</h1>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mt-1">Security Verification Flow</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-8 shadow-sm">
          {step === "EMAIL" && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold text-gray-900">Forgot Password?</h2>
                <p className="text-[13px] text-gray-500">Enter your university email and we'll send you a 6-digit code to verify your identity.</p>
              </div>
              <Input
                label="Email Address"
                placeholder="e.g. name@esst-sup.dz"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Send Verification Code
              </Button>
            </form>
          )}

          {step === "OTP" && (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold text-gray-900">Enter Verification Code</h2>
                <p className="text-[13px] text-gray-500">A security code has been sent to <strong>{email}</strong>. It expires in 5 minutes.</p>
              </div>
              <Input
                label="6-Digit OTP Code"
                placeholder="000 000"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                icon={ShieldCheck}
                className="text-center tracking-[0.5em] text-lg font-bold"
                required
              />
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Verify Code
              </Button>
              <button 
                type="button" 
                onClick={() => setStep("EMAIL")}
                className="w-full text-[12px] text-gray-400 hover:text-indigo-600 transition-colors"
                disabled={isLoading}
              >
                Send to a different email?
              </button>
            </form>
          )}

          {step === "RESET" && (
            <form onSubmit={handleResetPassword} className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="space-y-2">
                <h2 className="text-[15px] font-semibold text-gray-900">Set New Password</h2>
                <p className="text-[13px] text-gray-500">Your identity has been verified. Choose a secure new password for your account.</p>
              </div>
              <div className="space-y-4">
                <Input
                  label="New Password"
                  type="password"
                  placeholder="••••••••"
                  value={passwords.password}
                  onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                  required
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  placeholder="••••••••"
                  value={passwords.confirm}
                  onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Reset Password
              </Button>
            </form>
          )}

          {step === "SUCCESS" && (
            <div className="text-center space-y-6 py-4 animate-in zoom-in-95">
              <div className="h-16 w-16 bg-green-50 text-green-600 rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-[16px] font-semibold text-gray-900">Password Updated</h2>
                <p className="text-[13px] text-gray-500">Your password has been reset successfully. You can now log in with your new credentials.</p>
              </div>
              <Button onClick={() => router.push("/login")} className="w-full">
                Go to Login
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
