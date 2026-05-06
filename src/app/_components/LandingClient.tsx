"use client";
// Removed dark mode

import React from "react";
import Link from "next/link";
import { BookOpen, Users, Briefcase, CheckCircle2, UserPlus, Clock, Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import DashboardVisual from "./DashboardVisual";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

interface Props {
  logoUrl: string;
  academicYear: string;
}

export default function LandingClient({ logoUrl, academicYear }: Props) {
  const { t, language, setLanguage, isRTL } = useTranslation();

  return (
    <div className={`min-h-screen bg-white font-sans text-gray-900 ${isRTL ? "rtl" : "ltr"} relative overflow-hidden`}>
      
      {/* Background elements */}
      <div className="fixed inset-0 bg-linkedin-neutral/30 pointer-events-none -z-10" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-white z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3">
               <div className="h-9 w-9 flex items-center justify-center">
                {logoUrl ? (
                  <img src={logoUrl} alt="ESST" className="h-full w-full object-contain" />
                ) : (
                  <div className="h-9 w-9 bg-brand-deep rounded-lg flex items-center justify-center text-white font-black text-xs">ESST</div>
                )}
              </div>
              <span className="font-black text-[22px] tracking-tight text-brand-deep">ESST Internship Portal</span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center bg-gray-100 rounded-full p-1 gap-1">
                {LANGS.map(({ code, label }) => (
                  <button key={code} onClick={() => setLanguage(code)}
                    className={`h-7 px-3 rounded-full text-[11px] font-bold transition-all
                      ${language === code ? "bg-white text-brand-deep shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                    {label}
                  </button>
                ))}
              </div>
              
              <Link href="/login" className="px-6 py-2 border border-brand-deep text-brand-deep text-[16px] font-bold rounded-full hover:bg-gray-50 transition-all">
                {t("auth.login")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-0 overflow-hidden relative bg-white">
        <section className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-start relative min-h-[500px]">

          <div className="lg:w-3/5 text-left z-10">
            <h1 className="text-[48px] md:text-[64px] text-brand-deep font-black leading-[1] tracking-tight mb-6">
              {t("landing.hero.title")}
            </h1>
            <p className="text-[20px] text-gray-500 leading-relaxed max-w-xl mb-10">
              {t("landing.hero.subtitle")}
            </p>
            <div className="flex gap-4">
               <Link href="/login" className="px-8 py-3 bg-brand-deep text-white rounded-full text-[16px] font-bold hover:bg-black transition-all shadow-md">
                  {t("landing.hero.getStarted")}
               </Link>
            </div>
          </div>
        </section>

        {/* Visual Dashboard Cards */}
        <section className="py-20 bg-white relative">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-[32px] font-black text-center mb-12 text-brand-deep uppercase tracking-widest">
              {t("landing.preview.title")}
            </h2>
            <DashboardVisual />
          </div>
        </section>

        <div className="h-20" />

        {/* Feature Grid */}
        <section className="bg-linkedin-neutral/40 py-20 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-20 items-center mb-24">
               <div className="lg:col-span-5">
                  <h2 className="text-[48px] font-light text-gray-800 leading-tight mb-6">
                    {t("landing.topics.title")}
                  </h2>
                  <p className="text-[20px] text-gray-500 leading-relaxed mb-10">
                    {t("landing.topics.subtitle")}
                  </p>
                  <Link href="/login" className="px-10 py-4 border border-gray-800 text-gray-800 rounded-full text-lg font-bold hover:bg-gray-100 transition-all">
                    {t("landing.topics.seeAll")}
                  </Link>
               </div>
               <div className="lg:col-span-7 grid grid-cols-2 gap-6">
                  <TopicCard title={t("landing.topics.robotics.title")} desc={t("landing.topics.robotics.desc")} icon={<div className="h-10 w-10 bg-brand-purple/10 rounded-xl" />} />
                  <TopicCard title={t("landing.topics.cyber.title")} desc={t("landing.topics.cyber.desc")} icon={<div className="h-10 w-10 bg-brand-pink/10 rounded-xl" />} />
                  <TopicCard title={t("landing.topics.bigdata.title")} desc={t("landing.topics.bigdata.desc")} icon={<div className="h-10 w-10 bg-brand-accent/10 rounded-xl" />} />
                  <TopicCard title={t("landing.topics.chemistry.title")} desc={t("landing.topics.chemistry.desc")} icon={<div className="h-10 w-10 bg-brand-deep/10 rounded-xl" />} />
               </div>
            </div>
          </div>
        </section>

        {/* Post/CTA Section */}
        <section className="py-20 relative">
           <div className="absolute top-1/2 left-0 w-64 h-64 bg-brand-purple/5 blur-[100px] -z-10" />
           <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
              <div className="order-2 md:order-1">
                 <div className="space-y-6">
                    <FeatureItem num="01" title={t("auth.register")} desc={t("common.registrations")} />
                    <FeatureItem num="02" title={t("nav.topics")} desc={t("topics.title")} />
                    <FeatureItem num="03" title={t("status.APPROVED")} desc={t("topics.pendingApproval")} />
                    <FeatureItem num="04" title={t("status.COMPLETED")} desc={t("internship.title")} />
                 </div>
              </div>
              <div className="order-1 md:order-2">
                 <h2 className="text-[48px] font-light text-gray-800 leading-tight mb-8">Post your topics and find the right talent</h2>
                 <p className="text-[20px] text-gray-500 leading-relaxed mb-10">Whether you're a student with a vision or a company with a challenge, our platform makes it easy to collaborate.</p>
                 <Link href="/login" className="px-10 py-4 bg-brand-deep text-white rounded-full text-lg font-bold hover:bg-black transition-all shadow-xl">
                    Post a Topic
                 </Link>
              </div>
           </div>
        </section>

        {/* Join CTA */}
        <section className="bg-[#f1f2ee] pt-24 pb-12 relative overflow-hidden">
          
           <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
              <h2 className="text-[42px] font-light text-gray-800 mb-8">{t("landing.cta.title")}</h2>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                 <Link href="/register" className="w-full sm:w-auto px-10 py-4 bg-brand-deep text-white rounded-full text-lg font-bold hover:bg-black transition-all shadow-xl">
                    {t("landing.cta.join")}
                 </Link>
                 <Link href="/login" className="w-full sm:w-auto px-10 py-4 border border-gray-800 text-gray-800 rounded-full text-lg font-bold hover:bg-gray-100 transition-all">
                    {t("auth.login")}
                 </Link>
              </div>
           </div>
        </section>
      </main>

      <footer className="pt-12 pb-20 border-t border-gray-100 bg-gray-50/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-20">
            <div className="lg:col-span-4">
              <span className="font-black text-2xl text-brand-deep block mb-6">{t("landing.hero.title")}</span>
              <p className="text-gray-500 leading-relaxed mb-8 text-[15px]">{t("landing.footer.desc")}</p>
              <div className="flex gap-4 items-center">
                 <div className="h-2 w-2 rounded-full bg-emerald-500" />
                 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{t("landing.footer.status")}</span>
              </div>
            </div>
            <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-[13px] text-gray-500">
              <div>
                <h5 className="text-gray-900 font-bold mb-4">{t("common.registrations")}</h5>
                <ul className="space-y-2">
                  <li><Link href="/register" className="hover:text-brand-deep transition-colors">{t("auth.register")}</Link></li>
                  <li><Link href="/login" className="hover:text-brand-deep transition-colors">{t("auth.login")}</Link></li>
                </ul>
              </div>
              <div>
                <h5 className="text-gray-900 font-bold mb-4">{t("nav.topics")}</h5>
                <ul className="space-y-2">
                  <li><Link href="/login" className="hover:text-brand-deep transition-colors">{t("topics.title")}</Link></li>
                  <li><Link href="/login" className="hover:text-brand-deep transition-colors">{t("topics.propose")}</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center text-[11px] text-gray-400 gap-4">
             <p>© {new Date().getFullYear()} ESST - École Supérieure des Sciences et Technologies</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TopicCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-lg transition-all group">
      <div className="mb-4">{icon}</div>
      <h4 className="text-[18px] font-bold text-gray-900 mb-2">{title}</h4>
      <p className="text-[14px] text-gray-500 leading-relaxed">{desc}</p>
    </div>
  );
}

function FeatureItem({ num, title, desc }: { num: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-6 group">
       <div className="h-12 w-12 rounded-xl bg-brand-deep/5 flex items-center justify-center text-brand-deep font-bold text-lg">{num}</div>
       <div>
          <h4 className="text-[16px] font-bold text-gray-900">{title}</h4>
          <p className="text-[13px] text-gray-500 uppercase tracking-wider font-medium">{desc}</p>
       </div>
    </div>
  );
}
