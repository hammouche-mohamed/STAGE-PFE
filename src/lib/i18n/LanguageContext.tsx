"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { Language, translations } from "./translations";

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (path: string) => string;
  isRTL: boolean;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("app_lang") as Language;
    if (saved && (saved === "en" || saved === "fr" || saved === "ar")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("app_lang", lang);
  };

  const isRTL = language === "ar";

  useEffect(() => {
    document.documentElement.dir = isRTL ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, isRTL]);

  // Simple t function to resolve "common.dashboard" -> translations[lang].common.dashboard
  const t = (path: string): string => {
    const keys = path.split(".");
    let current: any = translations[language];
    
    for (const key of keys) {
      if (current && current[key]) {
        current = current[key];
      } else {
        return path; // Fallback to path if not found
      }
    }
    
    return typeof current === "string" ? current : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div className={isRTL ? "font-arabic" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider");
  }
  return context;
}
