"use client";

import React, { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginInput = z.infer<typeof loginSchema>;

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const { t, language, setLanguage, isRTL } = useTranslation();

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });
  const [authError, setAuthError] = useState<string | null>(null);

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const result = await signIn("credentials", { ...data, redirect: false });
      if (result?.error) {
        setAuthError(t("errors.unauthorized"));
        return;
      }
      
      toast.success(t("auth.login"));
      const sessionResult = await fetch('/api/auth/session').then(res => res.json());
      const role = sessionResult?.user?.role?.toLowerCase();
      
      if (role) {
        router.push(`/${role}`);
      } else {
        router.push("/");
      }
    } catch {
      toast.error(t("errors.serverError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 ${isRTL ? "rtl" : "ltr"}`}>
      {/* Language switcher top-right */}
      <div className={`fixed top-4 ${isRTL ? "left-4" : "right-4"} z-50 flex items-center bg-white border border-gray-200 rounded-full p-0.5 gap-0.5 shadow-sm`}>
        {LANGS.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setLanguage(code)}
            className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
              ${language === code ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="h-12 w-12 bg-indigo-600 rounded-md mx-auto mb-4 flex items-center justify-center shadow-sm">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[17px] font-semibold text-gray-900 uppercase tracking-tight">ESST</h1>
          <p className="text-[11px] text-gray-400 uppercase tracking-widest font-medium mt-1">{t("common.appSubtitle")}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-8 shadow-sm">
          <h2 className="text-[15px] font-medium text-gray-900 mb-6">{t("auth.login")}</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-2 border-red-600 text-[11px] text-red-700 font-medium rounded-r">
              {t("errors.serverError")}: {error}
            </div>
          )}

          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-[13px] text-red-700 font-medium rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <Input
              label={t("common.email")}
              type="email"
              placeholder="e.g. salim@example.com"
              {...register("email")}
              error={errors.email?.message}
              required
            />

            <div className="space-y-1">
              <div className={`flex justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <label className="admin-form-label" htmlFor="password">{t("common.password")}</label>
                <Link href="/forgot-password" className="text-[11px] text-indigo-600 hover:text-indigo-700">
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                error={errors.password?.message}
                required
              />
            </div>

            <Button type="submit" className="w-full" isLoading={isLoading} size="lg">
              {t("auth.login")}
            </Button>

            <button
              type="button"
              onClick={() => router.back()}
              className="flex items-center justify-center gap-2 w-full py-2 text-[13px] text-gray-500 hover:text-indigo-600 font-medium transition-colors cursor-pointer"
            >
              <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
              {t("common.back")}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-[13px] text-gray-500">
              {t("auth.register")}?{" "}
              <Link href="/register" className="text-indigo-600 font-medium hover:text-indigo-700">
                {t("common.registrations")}
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-8 uppercase tracking-[0.2em] font-medium">
          Official University Administrative Portal
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
