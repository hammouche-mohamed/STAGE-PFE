"use client";
// Removed dark mode

import React from "react";
import Link from "next/link";
import {
  BookOpen, Users, Briefcase, CheckCircle2, UserPlus, Clock, Plus,
  Bot, ShieldCheck, Database, FlaskConical, Calendar,
  Unlock, Lock
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import DashboardVisual from "./DashboardVisual";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

const HERO_IMAGES = [
  { src: "/spec.jpg", duration: 7000 },
  { src: "/group.jpg", duration: 5000 }
];

interface LandingClientProps {
  logoUrl: string;
  academicYear: string;
  registrationOpen: string;
}

export default function LandingClient({ logoUrl, academicYear, registrationOpen }: LandingClientProps) {
  const { t, language, setLanguage, isRTL } = useTranslation();
  const { data: session } = useSession();
  const dashboardUrl = session?.user?.role ? `/${session.user.role.toLowerCase()}` : "/login";
  const [isClosedModalOpen, setIsClosedModalOpen] = React.useState(false);
  const router = useRouter();

  const [currentImage, setCurrentImage] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentImage((prev) => (prev + 1) % HERO_IMAGES.length);
    }, HERO_IMAGES[currentImage].duration);
    return () => clearTimeout(timer);
  }, [currentImage]);

  const handleRegisterClick = (e: React.MouseEvent) => {
    if (registrationOpen === "false") {
      e.preventDefault();
      setIsClosedModalOpen(true);
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 font-sans text-gray-900 ${isRTL ? "rtl" : "ltr"} relative overflow-hidden`}>

      {/* Background elements */}
      <div className="fixed inset-0 bg-linkedin-neutral/30 pointer-events-none -z-10" />

      <header className="fixed top-0 left-0 right-0 h-16 bg-blue-50/80 backdrop-blur-md z-50 border-b border-blue-100/50">
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
              <span className="font-black text-[16px] md:text-[22px] tracking-tight text-brand-deep hidden min-[500px]:block">ESST Internship Portal</span>
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

              <div className="flex items-center gap-3">
                <Link href={dashboardUrl} className="px-4 py-1.5 md:px-6 md:py-2 border border-brand-deep text-brand-deep text-[13px] md:text-[16px] font-bold rounded-full hover:bg-gray-50 transition-all whitespace-nowrap">
                  {session ? t("common.dashboard") : t("auth.login")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="pt-16 pb-0 overflow-hidden relative bg-transparent">
        <section className="relative w-full h-[500px] lg:h-[650px] flex items-center overflow-hidden bg-gray-900">
          {/* Scrolling Background Images */}
          <div
            className="absolute inset-0 flex transition-transform duration-1000 ease-in-out"
            style={{ transform: `translateX(${isRTL ? currentImage * 100 : -currentImage * 100}%)` }}
          >
            {HERO_IMAGES.map((img, idx) => (
              <div
                key={`${img.src}-${idx}`}
                className="w-full h-full flex-shrink-0 relative"
              >
                <img
                  src={img.src}
                  alt={`Hero ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading="eager"
                />
                <div className="absolute inset-0 bg-black/50" /> {/* Dark overlay */}
              </div>
            ))}
          </div>

          {/* Slider Indicators */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-20">
            {HERO_IMAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentImage(idx)}
                className={`h-2 transition-all rounded-full ${idx === currentImage ? "w-8 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
                  }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <div className="max-w-7xl mx-auto px-6 w-full h-full z-10 flex flex-col justify-center">
            <div className="w-full lg:w-3/5 text-center lg:text-left pt-12 md:pt-0">
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full animate-fade-in" style={{ animationDelay: "100ms" }}>
                  <Calendar className="h-3.5 w-3.5 text-blue-300" />
                  <span className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">{t("common.academicYear")} {academicYear}</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full animate-fade-in" style={{ animationDelay: "200ms" }}>
                  {registrationOpen === "true" ? (
                    <>
                      <Unlock className="h-3 w-3 text-green-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t("common.registrationsOpen")}</span>
                    </>
                  ) : (
                    <>
                      <Lock className="h-3 w-3 text-red-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t("common.registrationsClosed")}</span>
                    </>
                  )}
                </div>
              </div>
              <h1 className="text-[28px] sm:text-[36px] md:text-[64px] text-white font-black leading-tight tracking-tight mb-6 animate-fade-in">
                ESST Internship Portal
              </h1>
              <p className="text-[14px] sm:text-[16px] md:text-[20px] text-gray-200 leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8 md:mb-10 animate-fade-in" style={{ animationDelay: "200ms" }}>
                {t("landing.hero.subtitle")}
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 animate-fade-in" style={{ animationDelay: "400ms" }}>
                <Link href={dashboardUrl} className="px-6 py-2.5 md:px-8 md:py-3 bg-brand-deep text-white rounded-full text-[14px] md:text-[16px] font-bold hover:bg-black transition-all shadow-md min-w-[140px] md:min-w-[160px] text-center border border-white/20">
                  {session ? t("common.dashboard") : t("auth.login")}
                </Link>
                {!session && (
                  <Link 
                    href="/register" 
                    onClick={handleRegisterClick}
                    className="px-6 py-2.5 md:px-8 md:py-3 bg-white text-brand-deep rounded-full text-[14px] md:text-[16px] font-bold hover:bg-gray-100 transition-all min-w-[140px] md:min-w-[160px] text-center shadow-md"
                  >
                    {t("auth.register")}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>


        {/* Visual Dashboard Cards */}
        <section className="pt-12 md:pt-20 pb-16 md:pb-32 bg-transparent relative">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-[20px] md:text-[32px] font-black text-center mb-8 md:mb-12 text-brand-deep uppercase tracking-widest">
              {t("landing.preview.title")}
            </h2>
            <DashboardVisual />
          </div>
        </section>

        <div className="h-20" />

        <div className="h-[2px] w-[80%] mx-auto bg-brand-deep/15 mt-4 mb-4" />

        {/* Feature Grid */}
        <section className="bg-slate-100/50 pt-10 pb-10 relative">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid lg:grid-cols-12 gap-20 items-center mb-24">
              <div className="lg:col-span-5">
                <h2 className="text-[32px] md:text-[48px] font-light text-gray-800 leading-tight mb-6">
                  {t("landing.topics.title")}
                </h2>
                <p className="text-[20px] text-gray-500 leading-relaxed mb-10">
                  {t("landing.topics.subtitle")}
                </p>
                <Link href="/login" className="px-10 py-4 border border-gray-800 text-gray-800 rounded-full text-lg font-bold hover:bg-gray-100 transition-all">
                  {t("landing.topics.seeAll")}
                </Link>
              </div>
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <TopicCard
                  title={t("landing.topics.robotics.title")}
                  desc={t("landing.topics.robotics.desc")}
                  icon={<Bot className="h-6 w-6 text-brand-accent" />}
                />
                <TopicCard
                  title={t("landing.topics.cyber.title")}
                  desc={t("landing.topics.cyber.desc")}
                  icon={<ShieldCheck className="h-6 w-6 text-brand-accent" />}
                />
                <TopicCard
                  title={t("landing.topics.bigdata.title")}
                  desc={t("landing.topics.bigdata.desc")}
                  icon={<Database className="h-6 w-6 text-brand-accent" />}
                />
                <TopicCard
                  title={t("landing.topics.chemistry.title")}
                  desc={t("landing.topics.chemistry.desc")}
                  icon={<FlaskConical className="h-6 w-6 text-brand-accent" />}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="h-[2px] w-[65%] mx-auto bg-brand-deep/15 mt-4 mb-4" />

        {/* Post/CTA Section */}
        <section className="py-10 relative">
          <div className="absolute top-1/2 left-0 w-64 h-64 bg-brand-purple/5 blur-[100px] -z-10" />
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="space-y-6">
                <FeatureItem num="01" title={t("landing.features.item1_title")} desc={t("landing.features.item1_desc")} />
                <FeatureItem num="02" title={t("landing.features.item2_title")} desc={t("landing.features.item2_desc")} />
                <FeatureItem num="03" title={t("landing.features.item3_title")} desc={t("landing.features.item3_desc")} />
                <FeatureItem num="04" title={t("landing.features.item4_title")} desc={t("landing.features.item4_desc")} />
              </div>
            </div>
            <div className="order-1 md:order-2 text-center md:text-left">
              <h2 className="text-[32px] md:text-[48px] font-light text-gray-800 leading-tight mb-8">{t("landing.postTopic.title")}</h2>
              <p className="text-[16px] md:text-[20px] text-gray-500 leading-relaxed mb-10">{t("landing.postTopic.subtitle")}</p>
              <Link href="/login" className="px-10 py-4 bg-brand-deep text-white rounded-full text-lg font-bold hover:bg-black transition-all shadow-xl">
                {t("landing.postTopic.button")}
              </Link>
            </div>
          </div>
        </section>

        <div className="h-[2px] w-[45%] mx-auto bg-brand-deep/15 mt-4 mb-4" />

        {/* Join CTA */}
        <section className="bg-transparent pt-10 pb-12 relative overflow-hidden">

          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <h2 className="text-[42px] font-light text-gray-800 mb-8">{t("landing.cta.title")}</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register" 
                onClick={handleRegisterClick}
                className="w-full sm:w-auto px-10 py-4 bg-brand-deep text-white rounded-full text-lg font-bold hover:bg-black transition-all shadow-xl"
              >
                {t("landing.cta.join")}
              </Link>
              <Link href="/login" className="w-full sm:w-auto px-10 py-4 border border-gray-800 text-gray-800 rounded-full text-lg font-bold hover:bg-gray-100 transition-all">
                {t("auth.login")}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="pt-8 pb-10 border-t border-white/10 bg-brand-deep text-white/70">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 mb-10">
            {/* Left: Mission */}
            <div className="lg:col-span-5">
              <span className="font-black text-xl text-white block mb-4">ESST Internship Portal</span>
              <p className="text-white/60 leading-relaxed mb-6 text-[14px]">
                {t("landing.footer.desc")}
              </p>
              <div className="flex gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{t("landing.footer.status")}</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 text-white/40" />
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Year: {academicYear}</span>
                </div>
              </div>
            </div>
            
            {/* Right Group: Links */}
            <div className="lg:col-span-7 grid grid-cols-2 gap-8 text-[12px] lg:pl-20">
              <div>
                <h5 className="text-white font-bold mb-6 uppercase tracking-widest text-[10px] opacity-50">{t("landing.footer.registrations")}</h5>
                <ul className="space-y-4">
                  <li>
                    <Link 
                      href="/register" 
                      onClick={handleRegisterClick}
                      className="text-white/70 hover:text-white transition-colors text-[14px]"
                    >
                      {t("auth.register")}
                    </Link>
                  </li>
                  <li><Link href="/login" className="text-white/70 hover:text-white transition-colors text-[14px]">{t("auth.login")}</Link></li>
                </ul>
              </div>

              <div>
                <h5 className="text-white font-bold mb-6 uppercase tracking-widest text-[10px] opacity-50">{t("landing.footer.topics")}</h5>
                <ul className="space-y-4">
                  <li><Link href="/login" className="text-white/70 hover:text-white transition-colors text-[14px]">{t("landing.footer.available")}</Link></li>
                  <li><Link href="/login" className="text-white/70 hover:text-white transition-colors text-[14px]">{t("landing.footer.propose")}</Link></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-col items-center text-center text-[13px] text-white/40 gap-4">
            <p>© {new Date().getFullYear()} ESST - École Supérieure des Sciences et Technologies</p>
          </div>
        </div>
      </footer>

      <Modal
        isOpen={isClosedModalOpen}
        onClose={() => setIsClosedModalOpen(false)}
        title={t("auth.portalClosed")}
        size="sm"
        footer={<Button onClick={() => setIsClosedModalOpen(false)} className="w-full">{t("common.close")}</Button>}
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-6">
            <Lock className="h-8 w-8" />
          </div>
          <h3 className="text-[18px] font-bold text-gray-900 mb-2">{t("auth.portalClosed")}</h3>
          <p className="text-[14px] text-gray-500 leading-relaxed mb-4">
            {t("auth.portalClosedDesc")}
          </p>
        </div>
      </Modal>
    </div>
  );
}

function TopicCard({ title, desc, icon }: { title: string; desc: string; icon: React.ReactNode }) {
  return (
    <div className="p-6 bg-brand-deep border border-white/10 rounded-2xl hover:border-brand-accent hover:bg-slate-900 transition-all group flex flex-col items-start text-left shadow-xl">
      <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h4 className="text-[18px] font-bold text-white mb-3">{title}</h4>
      <p className="text-[14px] text-white/70 leading-relaxed">{desc}</p>
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
