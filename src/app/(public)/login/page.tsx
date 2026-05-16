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
import Image from "next/image";
import { ShieldCheck, ArrowLeft, Globe } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import { ThemeToggle } from "@/components/ThemeToggle";

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

  // If the browser restored the login page from bfcache (e.g. after the user
  // hit "Back" from a previously authenticated page), force a fresh load so
  // the form state and CSRF cookie are guaranteed clean.
  React.useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

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
        if (result.error.startsWith("TOO_MANY_ATTEMPTS:")) {
          const waitTime = result.error.split(":")[1];
          setAuthError(`Too many failed attempts. Please wait ${waitTime} minutes before trying again.`);
        } else {
          setAuthError(t("errors.unauthorized"));
        }
        return;
      }

      toast.success(t("auth.login"));
      const role = (result as any)?.role
        || (await fetch('/api/auth/session').then(r => r.json()).catch(() => null))?.user?.role;
      window.location.replace(role ? `/${String(role).toLowerCase()}` : "/");
    } catch (e) {
      toast.error(t("errors.serverError"));
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={"min-h-screen w-full flex relative " + (isRTL ? "rtl" : "ltr")}>
      <div className="fixed inset-0 lg:relative lg:w-1/2 bg-gray-900 z-0">
        <div className="absolute inset-0 bg-indigo-950/80 z-10" />
        <Image
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=800&q=60"
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
            <h2 className="text-4xl font-bold mb-4 tracking-tight text-white drop-shadow-lg">Empowering Your Academic Journey</h2>
            <p className="text-lg text-white/90 max-w-md leading-relaxed drop-shadow-md">
              Join the official ESST portal to manage your internships, academic progress, and professional development in one seamless platform.
            </p>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-4 sm:p-12 lg:bg-gray-50 dark:lg:bg-slate-950 relative z-10 min-h-screen lg:bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:lg:bg-[radial-gradient(#1e293b_1px,transparent_1px)] lg:[background-size:20px_20px]">
        <div className="absolute top-6 left-6 z-50">
          <ThemeToggle />
        </div>

        <div className={`absolute top-6 ${isRTL ? "left-16" : "right-6"} z-50 flex items-center gap-3`}>
          <div className="flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full p-0.5 gap-0.5 shadow-sm">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLanguage(code)}
                className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
                  ${language === code ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="w-full max-w-[460px] relative z-10">
          <div className="text-center mb-8 lg:hidden">
            <div className="h-14 w-14 bg-white rounded-lg mx-auto mb-4 flex items-center justify-center shadow-xl">
              <ShieldCheck className="h-8 w-8 text-indigo-600" />
            </div>
            <h1 className="text-[20px] font-bold text-white uppercase tracking-tight drop-shadow-md">ESST Portal</h1>
            <p className="text-[12px] text-white/80 uppercase tracking-widest font-medium mt-1 drop-shadow-sm">{t("common.appSubtitle")}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl lg:rounded-md p-8 shadow-2xl lg:shadow-sm transition-colors duration-300">
            <h2 className="text-[15px] font-medium text-gray-900 dark:text-white mb-6">{t("auth.login")}</h2>

            {error && (
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border-l-2 border-amber-600 text-[11px] text-amber-700 dark:text-amber-400 font-medium rounded-r">
                {error === "SessionTimeout"
                  ? "You were signed out after 5 minutes of inactivity. Please sign in again."
                  : error === "SessionExpired" || error === "SessionRequired" || error === "OAuthSignin"
                    ? t("errors.sessionExpired")
                    : `${t("errors.serverError")}: ${error}`}
              </div>
            )}

            {authError && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-[13px] text-red-700 dark:text-red-400 font-medium rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                {authError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label={t("common.email")}
                type="email"
                placeholder="yourname@example.com"
                {...register("email")}
                error={errors.email?.message}
                required
              />

              <div className="space-y-1">
                <div className={`flex justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                  <label className="admin-form-label dark:text-gray-300" htmlFor="password">{t("common.password")}</label>
                  <Link href="/forgot-password" className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-700">
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

              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-2 text-[13px] text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors cursor-pointer"
              >
                <ArrowLeft className={`h-4 w-4 ${isRTL ? "rotate-180" : ""}`} />
                {t("common.back")}
              </Link>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-800 text-center">
              <p className="text-[13px] text-gray-500 dark:text-gray-400">
                {t("auth.register")}?{" "}
                <Link href="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700">
                  {t("common.registrations")}
                </Link>
              </p>
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
      <LoginForm />
    </Suspense>
  );
}
