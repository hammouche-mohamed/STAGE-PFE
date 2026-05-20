"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useSidebar } from "@/lib/contexts/SidebarContext";
import { useApi } from "@/lib/swr/useApi";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  FileText,
  MessageSquare,
  LogOut,
  ShieldCheck,
  User as UserIcon,
  Settings,
  X,
  Archive,
  GraduationCap,
  Building2,
  Mail,
  CalendarClock,
} from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface SidebarProps {
  role: "STUDENT" | "TEACHER" | "COMPANY" | "ADMIN";
  logoUrl?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ role: initialRole, logoUrl }) => {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t, language, isRTL } = useTranslation();
  const { isOpen, setIsOpen, toggle } = useSidebar();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  
  const role = initialRole || session?.user?.role || "STUDENT";
  const roleSlug = role.toLowerCase();

  const displayName = session?.user?.name ?? "User";
  const initials = displayName
    .split(" ")
    .map((s) => s[0])
    .join("")
    .toUpperCase();

  // Cached + persisted across reloads; still self-refreshes every 30 s so the
  // badges stay live without the user staring at empty counts on every load.
  const { data: counts = {} } = useApi<Record<string, number>>(
    session ? "/api/sidebar/counts" : null,
    { refreshInterval: 30_000, revalidateOnFocus: true },
  );

  const navItems = React.useMemo(() => {
    const items = (() => {
      switch (role) {
        case "ADMIN":
          const adminItems = [
            { label: t("common.dashboard"), icon: LayoutDashboard, href: "/admin", active: pathname === "/admin" },
            { label: t("common.users"), icon: Users, href: "/admin/users", active: pathname.startsWith("/admin/users") },
            { label: t("common.topics"), icon: Briefcase, href: "/admin/topics", active: pathname.startsWith("/admin/topics") },
            { label: t("common.internships"), icon: ShieldCheck, href: "/admin/internships", active: pathname.startsWith("/admin/internships") },
            { label: t("common.milestones", { defaultValue: "Milestones" }), icon: CalendarClock, href: "/admin/milestones", active: pathname.startsWith("/admin/milestones") },
            ...(!session?.user?.isSuperAdmin ? [{ label: t("common.messages"), icon: MessageSquare, href: "/admin/messages", active: pathname.startsWith("/admin/messages") }] : []),
            { label: t("nav.archives"), icon: Archive, href: "/admin/archives", active: pathname.startsWith("/admin/archives") },
          ];

          // Registrations (granting account access) is a SuperAdmin-only flow.
          if (session?.user?.isSuperAdmin) {
            adminItems.splice(1, 0, { label: t("common.registrations"), icon: UserIcon, href: "/admin/registrations", active: pathname.startsWith("/admin/registrations") });
            adminItems.push({ label: t("nav.audit"), icon: FileText, href: "/admin/audit-logs", active: pathname.startsWith("/admin/audit-logs") });
            adminItems.push({ label: t("common.settings"), icon: Settings, href: "/admin/settings", active: pathname.startsWith("/admin/settings") });
          }
          
          adminItems.push({ label: t("common.profile"), icon: UserIcon, href: "/profile", active: pathname === "/profile" });
          return adminItems;
        case "TEACHER":
          return [
            { label: t("common.dashboard"), icon: LayoutDashboard, href: "/teacher", active: pathname === "/teacher" },
            { label: t("nav.supervision"), icon: ShieldCheck, href: "/teacher/internships", active: pathname.startsWith("/teacher/internships") },
            { label: t("common.topics"), icon: Briefcase, href: "/teacher/topics", active: pathname.startsWith("/teacher/topics") },
            { label: t("common.documents"), icon: FileText, href: "/teacher/documents", active: pathname.startsWith("/teacher/documents") },
            { label: t("common.messages"), icon: MessageSquare, href: "/teacher/messages", active: pathname.startsWith("/teacher/messages") },
            { label: t("nav.contact"), icon: Mail, href: "/contact", active: pathname === "/contact" },
            { label: t("common.profile"), icon: UserIcon, href: "/profile", active: pathname === "/profile" },
          ];
        case "COMPANY":
          return [
            { label: t("common.dashboard"), icon: LayoutDashboard, href: "/company", active: pathname === "/company" },
            { label: t("nav.myTopic"), icon: Briefcase, href: "/company/topics", active: pathname.startsWith("/company/topics") },
            { label: t("nav.applications"), icon: Users, href: "/company/applications", active: pathname.startsWith("/company/applications") },
            { label: t("common.internships"), icon: ShieldCheck, href: "/company/internships", active: pathname.startsWith("/company/internships") },
            { label: t("common.messages"), icon: MessageSquare, href: "/company/messages", active: pathname.startsWith("/company/messages") },
            { label: t("nav.contact"), icon: Mail, href: "/contact", active: pathname === "/contact" },
            { label: t("common.profile"), icon: UserIcon, href: "/profile", active: pathname === "/profile" },
          ];
        default: // STUDENT
          return [
            { label: t("common.dashboard"), icon: LayoutDashboard, href: "/student", active: pathname === "/student" },
            { label: "My Team", icon: Users, href: "/student/team", active: pathname.startsWith("/student/team") },
            { label: t("common.topics"), icon: Briefcase, href: "/student/topics", active: pathname.startsWith("/student/topics") },
            { label: t("common.internship"), icon: ShieldCheck, href: "/student/internship", active: pathname.startsWith("/student/internship") },
            { label: t("common.documentsAndMilestones", { defaultValue: "Documents & Milestones" }), icon: FileText, href: "/student/documents", active: pathname.startsWith("/student/documents") },
            { label: t("common.messages"), icon: MessageSquare, href: "/student/messages", active: pathname.startsWith("/student/messages") },
            { label: t("common.invitations"), icon: UserIcon, href: "/student/invitations", active: pathname.startsWith("/student/invitations") },
            { label: t("nav.archives"), icon: Archive, href: "/student/archives", active: pathname.startsWith("/student/archives") },
            { label: t("nav.contact"), icon: Mail, href: "/contact", active: pathname === "/contact" },
            { label: t("common.profile"), icon: UserIcon, href: "/profile", active: pathname === "/profile" },
          ];
      }
    })();

    return items.map(item => ({
      ...item,
      badge: counts[item.href] || 0
    }));
  }, [role, pathname, counts, t, session?.user?.isSuperAdmin]);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[45] md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`fixed top-0 z-50 h-full w-[240px] bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 flex flex-col transition-transform duration-300 ease-in-out
        ${isRTL ? "right-0 border-l" : "left-0 border-r"}
        ${isOpen ? "translate-x-0" : (isRTL ? "translate-x-full" : "-translate-x-full")}
        md:translate-x-0
      `}>
        {/* Brand Header */}
        <div className={`h-[56px] flex items-center justify-between px-6 border-b border-gray-100 dark:border-gray-800 ${isRTL ? "flex-row-reverse" : ""}`}>
          <Link href={`/${roleSlug}`} className="flex items-center gap-2.5">
            {logoUrl ? (
              <div className="h-8 w-8 rounded overflow-hidden">
                <Image src={logoUrl} alt="Logo" width={32} height={32} className="h-full w-full object-contain" unoptimized />
              </div>
            ) : (
              <div className="h-8 w-8 bg-indigo-600 dark:bg-indigo-500 rounded flex items-center justify-center text-white font-bold text-lg">E</div>
            )}
            <span className="font-bold text-[15px] text-gray-900 dark:text-white">ESST <span className="text-indigo-600 dark:text-indigo-400">Portal</span></span>
          </Link>
          
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between h-[40px] px-6 text-[13px] transition-colors group
                  ${item.active
                    ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-l-2 border-indigo-600 font-medium"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200 border-l-2 border-transparent"
                  } ${isRTL ? "flex-row-reverse border-l-0 border-r-2" : ""}`}
              >
                <div className={`flex items-center ${isRTL ? "flex-row-reverse gap-x-5" : "gap-x-3"}`}>
                  <Icon className={`h-[18px] w-[18px] ${item.active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"}`} />
                  {item.label}
                </div>
                {item.badge > 0 && (
                  <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <div className={`flex items-center mb-4 ${isRTL ? "flex-row-reverse gap-x-5" : "gap-x-3"}`}>
            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[12px] font-bold overflow-hidden">
              {session?.user?.image ? (
                <Image 
                  src={session.user.image} 
                  alt={displayName} 
                  width={32} 
                  height={32} 
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-500 uppercase tracking-wider font-semibold">
                {session?.user?.isSuperAdmin ? t("roles.SUPER_ADMIN") : t(`roles.${role}` as any)}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsLogoutDialogOpen(true)}
            className={`flex items-center w-full h-[36px] px-3 text-[13px] text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors cursor-pointer ${isRTL ? "flex-row-reverse gap-x-5" : "gap-x-3"}`}
          >
            <LogOut className="h-[18px] w-[18px]" />
            {t("common.logout")}
          </button>
        </div>

      </aside>
      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={() => {
          window.dispatchEvent(new Event("esst:logout"));
          signOut({ callbackUrl: "/" });
        }}
        title={t("logoutConfirm.title")}
        description={t("logoutConfirm.description")}
        confirmLabel={t("common.logout")}
        cancelLabel={t("common.cancel")}
        variant="warning"
      />
    </>
  );
};
