"use client";

import React from "react";
import { Mail, Phone, MapPin, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Button } from "@/components/ui/Button";

export default function ContactAdminPage() {
  const { t } = useTranslation();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">{t("contactPage.title")}</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {t("contactPage.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info Cards */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
                <Mail className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase text-[12px] tracking-wider">{t("contactPage.emailSupport")}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-[14px]">administration@esst-u.dz</p>
                <p className="text-gray-400 dark:text-gray-500 text-[12px]">{t("contactPage.emailDesc")}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <Phone className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase text-[12px] tracking-wider">{t("contactPage.phone")}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-[14px]">+213 (0) 23 45 67 89</p>
                <p className="text-gray-400 dark:text-gray-500 text-[12px]">{t("contactPage.phoneDesc")}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-gray-900 dark:text-white uppercase text-[12px] tracking-wider">{t("contactPage.office")}</h3>
                <p className="text-gray-600 dark:text-gray-300 text-[14px]">{t("contactPage.officeDesc")}</p>
                <p className="text-gray-400 dark:text-gray-500 text-[12px]">{t("contactPage.university")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions / FAQ */}
        <div className="bg-indigo-600 rounded-2xl p-8 text-white flex flex-col justify-between shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors" />
          
          <div className="relative space-y-6">
            <div className="h-14 w-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold leading-tight">{t("contactPage.techSupport")}</h2>
            <p className="text-indigo-100 text-[15px] leading-relaxed">
              {t("contactPage.techDesc")}
            </p>
            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-3 text-[13px] font-medium bg-white/10 p-3 rounded-lg border border-white/10">
                <Clock className="h-4 w-4" />
                {t("contactPage.hours")}
              </div>
            </div>
          </div>

          <div className="relative pt-8">
            <Button 
              variant="outline"
              className="w-full bg-white text-indigo-600 hover:bg-indigo-50 border-none font-bold h-auto py-4 text-[15px] rounded-xl shadow-lg transition-all"
              onClick={() => window.open("https://esst-dz.com", "_blank")}
            >
              {t("contactPage.visitWebsite")}
              <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center">
        <p className="text-[12px] text-gray-400 uppercase tracking-widest font-bold">
          © {new Date().getFullYear()} ESST Portal • Internal Coordination
        </p>
      </div>
    </div>
  );
}
