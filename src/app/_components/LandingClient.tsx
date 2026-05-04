"use client";

import React from "react";
import Link from "next/link";
import {
  Users, BookOpen, Briefcase, ArrowRight,
  CheckCircle2, Clock, ShieldCheck, UserPlus
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

interface Props {
  logoUrl: string;
  academicYear: string;
}

export function LandingClient({ logoUrl, academicYear }: Props) {
  const { t, language, setLanguage, isRTL } = useTranslation();

  const steps = [
    { step: "01", icon: UserPlus,     title: t("auth.register"),       desc: t("common.registrations") },
    { step: "02", icon: Clock,         title: t("nav.topics"),           desc: t("topics.title") },
    { step: "03", icon: CheckCircle2,  title: t("status.APPROVED"),      desc: t("topics.pendingApproval") },
    { step: "04", icon: ShieldCheck,   title: t("status.COMPLETED"),     desc: t("internship.title") },
  ];

  return (
    <div className={`min-h-screen bg-white font-sans text-gray-900 ${isRTL ? "rtl" : "ltr"}`}>

      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-3 overflow-hidden min-w-0">
            <div className="h-9 w-9 md:h-11 md:w-11 flex items-center justify-center flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="ESST Logo" className="h-full w-full object-contain" />
              ) : (
                <div className="h-full w-full bg-gray-200 rounded-md flex items-center justify-center text-[10px] font-bold text-gray-400">ESST</div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12px] md:text-[15px] font-bold tracking-tight text-gray-900 leading-tight truncate">
                ESST <span className="hidden sm:inline">— École Supérieure des Sciences et Technologies d&apos;Alger</span>
              </span>
              <span className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-0.5 truncate">
                {t("common.appSubtitle")}
              </span>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-6 flex-shrink-0">
            <a href="#process" className="text-[13px] font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              {t("common.internship")}
            </a>
            <a href="#roles" className="text-[13px] font-medium text-gray-600 hover:text-indigo-600 transition-colors">
              {t("common.role")}
            </a>

            {/* Language switcher */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
              {LANGS.map(({ code, label }) => (
                <button key={code} onClick={() => setLanguage(code)}
                  className={`h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
                    ${language === code ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-800"}`}>
                  {label}
                </button>
              ))}
            </div>

            <Link href="/login" className="px-4 py-2 bg-indigo-600 text-white text-[13px] font-semibold rounded-md hover:bg-indigo-700 transition-all shadow-sm">
              {t("auth.login")}
            </Link>
          </nav>

          <div className="lg:hidden flex items-center gap-2 flex-shrink-0">
            {/* Mobile lang switcher */}
            <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
              {LANGS.map(({ code, label }) => (
                <button key={code} onClick={() => setLanguage(code)}
                  className={`h-6 px-2 rounded-full text-[10px] font-bold transition-all
                    ${language === code ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>
                  {label}
                </button>
              ))}
            </div>
            <Link href="/login" className="px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-semibold rounded-md hover:bg-indigo-700 shadow-sm whitespace-nowrap">
              {t("auth.login")}
            </Link>
          </div>
        </div>
      </header>

      <main className="pt-24 md:pt-32">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-6 mb-16 md:mb-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100 mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500" />
              </span>
              <span className="text-[11px] md:text-[12px] font-bold uppercase tracking-wider">
                Academic Year {academicYear}
              </span>
            </div>

            <h1 className="text-[32px] sm:text-[44px] md:text-[56px] font-extrabold leading-[1.1] text-gray-900 tracking-tight mb-6 md:mb-8">
              {t("dashboard.activeInternship")}<br />
              <span className="text-indigo-600">{t("common.internships")}.</span>
            </h1>

            <p className="text-base md:text-lg text-gray-600 leading-relaxed mb-8 md:mb-10 max-w-2xl">
              The official platform for the École Supérieure des Sciences et Technologies d&apos;Alger.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link href="/register"
                className="w-full sm:w-auto px-8 h-12 md:h-14 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-[14px] md:text-[15px] hover:bg-black transition-all shadow-xl group">
                {t("auth.register")}
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/login"
                className="w-full sm:w-auto px-8 h-12 md:h-14 bg-white text-gray-900 border border-gray-200 rounded-lg flex items-center justify-center font-bold text-[14px] md:text-[15px] hover:bg-gray-50 transition-all shadow-sm">
                {t("auth.login")}
              </Link>
            </div>
          </div>
        </section>

        {/* Role Portals */}
        <section id="roles" className="bg-gray-50 py-24 border-y border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-[28px] font-bold text-gray-900 mb-4">{t("common.role")}</h2>
              <p className="text-gray-500">{t("dashboard.welcome")}</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {/* Student */}
              <div className="group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
                <div className="h-14 w-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Users className="h-7 w-7" />
                </div>
                <h3 className="text-[19px] font-bold text-gray-900 mb-3">{t("common.users")} — Student</h3>
                <p className="text-gray-500 text-[14px] leading-relaxed mb-8">{t("topics.title")}</p>
                <Link href="/login" className="inline-flex items-center text-indigo-600 font-bold text-[14px] hover:underline">
                  {t("auth.login")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
              {/* Teacher */}
              <div className="group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
                <div className="h-14 w-14 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BookOpen className="h-7 w-7" />
                </div>
                <h3 className="text-[19px] font-bold text-gray-900 mb-3">{t("nav.supervision")} Portal</h3>
                <p className="text-gray-500 text-[14px] leading-relaxed mb-8">{t("dashboard.supervisor")}</p>
                <Link href="/login" className="inline-flex items-center text-emerald-600 font-bold text-[14px] hover:underline">
                  {t("auth.login")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
              {/* Company */}
              <div className="group bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all">
                <div className="h-14 w-14 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Briefcase className="h-7 w-7" />
                </div>
                <h3 className="text-[19px] font-bold text-gray-900 mb-3">Industry Partner</h3>
                <p className="text-gray-500 text-[14px] leading-relaxed mb-8">{t("topics.propose")}</p>
                <Link href="/login" className="inline-flex items-center text-amber-600 font-bold text-[14px] hover:underline">
                  {t("auth.login")} <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Process */}
        <section id="process" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-20">
              <h2 className="text-[32px] font-extrabold text-gray-900">{t("common.internship")}</h2>
              <p className="text-gray-500 max-w-xl mx-auto mt-4">{t("internship.noInternship")}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
              <div className="hidden md:block absolute top-[44px] left-[50px] right-[50px] h-0.5 bg-gray-100 -z-10" />
              {steps.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="h-[90px] w-[90px] rounded-full bg-white border-4 border-gray-50 shadow-md flex items-center justify-center mb-6 relative">
                    <item.icon className="h-8 w-8 text-indigo-600" />
                    <span className="absolute -top-1 -right-1 h-7 w-7 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[11px] font-bold">
                      {item.step}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">{item.title}</h4>
                  <p className="text-[13px] text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-16 px-8">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-6">
                {logoUrl ? (
                  <img src={logoUrl} alt="ESST Logo" className="h-10 w-10 object-contain" />
                ) : (
                  <div className="h-10 w-10 bg-gray-700 rounded-md flex items-center justify-center text-[9px] font-bold text-gray-400">ESST</div>
                )}
                <span className="text-white font-bold">ESST — École Supérieure des Sciences et Technologies</span>
              </div>
              <p className="text-[13px] leading-relaxed">{t("errors.unauthorized")}</p>
            </div>
            <div className="grid grid-cols-2 gap-24">
              <div>
                <h5 className="text-white font-bold mb-6">{t("nav.overview")}</h5>
                <ul className="space-y-4 text-[13px]">
                  <li><Link href="/login" className="hover:text-white transition-colors">{t("auth.login")}</Link></li>
                  <li><Link href="/register" className="hover:text-white transition-colors">{t("auth.register")}</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-white font-bold mb-6">{t("common.settings")}</h5>
                <ul className="space-y-4 text-[13px]">
                  <li><a href="#" className="hover:text-white transition-colors">{t("common.documents")}</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">{t("common.notifications")}</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[12px]">
            <p>© 2024 ESST — {t("common.appName")}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
