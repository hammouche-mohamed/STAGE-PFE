"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Bell, LogOut, Menu, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";
import { useSidebar } from "@/lib/contexts/SidebarContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const LANGS: { code: Language; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "ar", label: "ع" },
];

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, language, setLanguage, isRTL } = useTranslation();
  const { toggle } = useSidebar();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?count=true");
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count || 0);
      }
    } catch (error) {}
  }, []);

  useEffect(() => {
    fetchUnread();

    // Auto-poll every 30 seconds for real-time awareness
    const pollId = setInterval(fetchUnread, 30000);

    const handleUpdate = () => fetchUnread();
    window.addEventListener("notificationsUpdated", handleUpdate);
    
    return () => {
      clearInterval(pollId);
      window.removeEventListener("notificationsUpdated", handleUpdate);
    };
  }, [fetchUnread, session]);

  const { labels } = useBreadcrumbs();
  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, i) => {
      const href = "/" + parts.slice(0, i + 1).join("/");
      // Use label from context if available, otherwise capitalize path part
      const label = labels[part] || (part.charAt(0).toUpperCase() + part.slice(1));
      return { label, href };
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-[56px] bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-6 md:px-8 flex items-center justify-between flex-shrink-0">
      <div className={`flex items-center gap-2 md:gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggle}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className={`flex flex-col ${isRTL ? "text-right" : "text-left"}`}>
          <h1 className="text-[13px] md:text-[14px] font-bold text-gray-900 dark:text-white leading-tight line-clamp-1 max-w-[200px] md:max-w-[400px]">
            {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
          </h1>
          <div className="hidden md:flex items-center gap-1 text-[11px] text-gray-400 dark:text-gray-500">
            <span>Home</span>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.href}>
                <span>/</span>
                <span className={`line-clamp-1 max-w-[100px] ${i === breadcrumbs.length - 1 ? "text-gray-600 dark:text-gray-300 font-medium" : ""}`}>{b.label}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-3 md:gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>

        {/* ── Language Switcher ───────────────────────────────────── */}
        <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-full p-0.5 gap-0.5">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              title={code === "en" ? "English" : code === "fr" ? "Français" : "العربية"}
              className={`
                h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
                ${language === code
                  ? "bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm shadow-indigo-100 dark:shadow-none ring-1 ring-indigo-200 dark:ring-slate-600"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                }
                ${code === "ar" ? "font-arabic text-[13px]" : ""}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Action Icons ─────────────────────────────────────────── */}
        <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
          {/* Theme Toggle */}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          )}

          <Link href="/notifications" className="relative text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                {unreadCount}
              </span>
            )}
          </Link>
          
          <button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="hidden md:block text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={() => signOut({ callbackUrl: "/" })}
        title={t("logoutConfirm.title")}
        description={t("logoutConfirm.description")}
        confirmLabel={t("common.logout")}
        cancelLabel={t("common.cancel")}
        variant="warning"
      />
    </header>
  );
};

