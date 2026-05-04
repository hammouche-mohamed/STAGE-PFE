"use client";

import React, { useEffect, useState } from "react";
import { Bell, LogOut, Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";
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
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/notifications/unread/count");
        if (res.ok) {
          const data = await res.json();
          setUnreadCount(data.count || 0);
        }
      } catch (error) {}
    };
    fetchUnread();
  }, []);

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(Boolean);
    return parts.map((part, i) => ({
      label: part.charAt(0).toUpperCase() + part.slice(1),
      href: "/" + parts.slice(0, i + 1).join("/"),
    }));
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-[56px] bg-white border-b border-gray-200 sticky top-0 z-40 px-5 md:px-6 flex items-center justify-between">
      <div className={`flex items-center gap-2 md:gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggle}
          className="md:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-md transition-colors"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className={`flex flex-col ${isRTL ? "text-right" : "text-left"}`}>
          <h1 className="text-[13px] md:text-[14px] font-bold text-gray-900 leading-tight">
            {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
          </h1>
          <div className="hidden md:flex items-center gap-1 text-[11px] text-gray-400">
            <span>Home</span>
            {breadcrumbs.map((b, i) => (
              <React.Fragment key={b.href}>
                <span>/</span>
                <span className={i === breadcrumbs.length - 1 ? "text-gray-600 font-medium" : ""}>{b.label}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-3 md:gap-5 ${isRTL ? "flex-row-reverse" : ""}`}>

        {/* ── Language Switcher ───────────────────────────────────── */}
        <div className="flex items-center bg-gray-100 rounded-full p-0.5 gap-0.5">
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              onClick={() => setLanguage(code)}
              title={code === "en" ? "English" : code === "fr" ? "Français" : "العربية"}
              className={`
                h-7 px-2.5 rounded-full text-[11px] font-bold transition-all duration-200
                ${language === code
                  ? "bg-white text-indigo-700 shadow-sm shadow-indigo-100 ring-1 ring-indigo-200"
                  : "text-gray-500 hover:text-gray-800"
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
          <Link href="/notifications" className="relative text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {unreadCount}
              </span>
            )}
          </Link>
          
          <button
            onClick={() => setIsLogoutDialogOpen(true)}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={() => signOut({ callbackUrl: "/" })}
        title="Sign Out"
        description="Are you sure you want to sign out?"
        confirmLabel="Logout"
        variant="danger"
      />
    </header>
  );
};

