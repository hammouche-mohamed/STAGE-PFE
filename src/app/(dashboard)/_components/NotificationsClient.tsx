"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  X,
  MessageSquare,
  BookOpen,
  Briefcase,
  FileText,
  AlertTriangle,
  Shield,
  UserCheck,
  CheckCheck,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
  type?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  link?: string | null;
}

// ── relative time, Instagram-style ("now", "5m", "3h", "2d", "4w") ──────────
function timeAgo(date: string | Date): string {
  const d = new Date(date).getTime();
  const s = Math.max(0, Math.floor((Date.now() - d) / 1000));
  if (s < 45) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}d`;
  if (s < 2629800) return `${Math.floor(s / 604800)}w`;
  return new Date(date).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ── type → avatar icon + colour ─────────────────────────────────────────────
function visual(n: Notification): { Icon: any; ring: string; fg: string } {
  const t = (n.type || "").toUpperCase();
  const rt = (n.relatedType || "").toUpperCase();
  if (t.includes("MESSAGE"))
    return { Icon: MessageSquare, ring: "from-sky-400 to-blue-500", fg: "text-white" };
  if (t.includes("TOPIC") || rt === "TOPIC")
    return t.includes("REJECT")
      ? { Icon: BookOpen, ring: "from-rose-400 to-red-500", fg: "text-white" }
      : { Icon: BookOpen, ring: "from-indigo-400 to-violet-500", fg: "text-white" };
  if (t.includes("TEACHER") || t.includes("APPLICATION") || t.includes("APPLIED") || t.includes("BINOME"))
    return t.includes("REJECT")
      ? { Icon: UserCheck, ring: "from-rose-400 to-red-500", fg: "text-white" }
      : { Icon: UserCheck, ring: "from-fuchsia-400 to-purple-500", fg: "text-white" };
  if (t.includes("INTERNSHIP"))
    return { Icon: Briefcase, ring: "from-emerald-400 to-teal-500", fg: "text-white" };
  if (t.includes("DOCUMENT") || t.includes("REPORT"))
    return { Icon: FileText, ring: "from-cyan-400 to-sky-500", fg: "text-white" };
  if (t.includes("DEADLINE") || t === "SECURITY" || t.includes("OVERDUE"))
    return { Icon: AlertTriangle, ring: "from-amber-400 to-orange-500", fg: "text-white" };
  if (t.includes("PASSWORD") || t.includes("ACCOUNT"))
    return { Icon: Shield, ring: "from-slate-400 to-slate-600", fg: "text-white" };
  return { Icon: Bell, ring: "from-gray-300 to-gray-400", fg: "text-white" };
}

function sectionOf(n: Notification): "New" | "Today" | "This week" | "Earlier" {
  if (!n.isRead) return "New";
  const d = new Date(n.createdAt).getTime();
  const diff = Date.now() - d;
  if (diff < 86400000) return "Today";
  if (diff < 604800000) return "This week";
  return "Earlier";
}

const ORDER = ["New", "Today", "This week", "Earlier"] as const;

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const { t } = useTranslation();
  const router = useRouter();

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        window.dispatchEvent(new Event("notificationsUpdated"));
      }
    } catch {
      toast.error("Failed to mark all as read");
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch("/api/notifications?all=true", { method: "DELETE" });
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new Event("notificationsUpdated"));
        setIsClearAllDialogOpen(false);
      }
    } catch {
      toast.error("Failed to clear notifications");
      setIsClearAllDialogOpen(false);
    }
  };

  const deleteOne = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    window.dispatchEvent(new Event("notificationsUpdated"));
    try {
      await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    } catch {
      /* optimistic — already removed from UI */
    }
  };

  // Phone-style: tapping a notification dismisses it (marked read + removed
  // from the list) and then opens its target.
  const openNotification = (n: Notification) => {
    setNotifications((prev) => prev.filter((x) => x.id !== n.id));
    window.dispatchEvent(new Event("notificationsUpdated"));
    fetch(`/api/notifications?id=${n.id}`, { method: "DELETE" }).catch(() => {});
    if (n.link) router.push(n.link);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // group into ordered sections
  const groups = ORDER.map((label) => ({
    label,
    items: notifications.filter((n) => sectionOf(n) === label),
  })).filter((g) => g.items.length > 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 px-1 pb-3 text-[13px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("common.back" as any)}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between px-1 pb-3">
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white">
          {t("nav.notifications" as any)}
          {unreadCount > 0 && (
            <span className="ml-2 align-middle inline-flex items-center justify-center text-[11px] font-bold text-white bg-rose-500 rounded-full px-2 py-0.5">
              {unreadCount}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-4">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-[12px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={() => setIsClearAllDialogOpen(true)}
              className="text-[12px] font-semibold text-gray-400 hover:text-red-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full border-2 border-gray-200 dark:border-slate-700 flex items-center justify-center mb-4">
            <Bell className="h-7 w-7 text-gray-300 dark:text-slate-600" />
          </div>
          <p className="text-[15px] font-semibold text-gray-900 dark:text-white">
            Activity On Your Account
          </p>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            When something happens, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <div key={group.label}>
              <h2 className="px-2 mb-1 text-[14px] font-bold text-gray-900 dark:text-white">
                {group.label}
              </h2>
              <div>
                {group.items.map((n) => {
                  const { Icon, ring, fg } = visual(n);
                  return (
                    <div
                      key={n.id}
                      onClick={() => openNotification(n)}
                      className={`group flex items-center gap-3 px-2 py-2.5 rounded-xl cursor-pointer transition-colors
                        ${
                          n.isRead
                            ? "hover:bg-gray-50 dark:hover:bg-slate-800/50"
                            : "bg-indigo-50/60 dark:bg-indigo-900/15 hover:bg-indigo-50 dark:hover:bg-indigo-900/25"
                        }`}
                    >
                      {/* avatar */}
                      <div
                        className={`relative flex-shrink-0 h-11 w-11 rounded-full bg-gradient-to-br ${ring} flex items-center justify-center shadow-sm`}
                      >
                        <Icon className={`h-5 w-5 ${fg}`} />
                      </div>

                      {/* text */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] leading-snug text-gray-900 dark:text-gray-100">
                          <span className="font-semibold">{n.title}</span>{" "}
                          <span className="text-gray-600 dark:text-gray-400">
                            {n.message}
                          </span>
                        </p>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>

                      {/* unread dot / delete */}
                      <div className="flex-shrink-0 flex items-center gap-1">
                        {!n.isRead && (
                          <span className="h-2.5 w-2.5 rounded-full bg-indigo-500 group-hover:hidden" />
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteOne(n.id);
                          }}
                          className="p-1.5 rounded-full text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={isClearAllDialogOpen}
        onClose={() => setIsClearAllDialogOpen(false)}
        onConfirm={clearAll}
        title="Clear All Notifications"
        description="Are you sure you want to delete all your notifications? This action cannot be undone."
        confirmLabel="Clear All"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
