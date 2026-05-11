"use client";

import React, { useState, useEffect } from "react";
import { Bell, CheckCircle, Circle, X, Trash2, CheckCheck } from "lucide-react";
import { formatDateTime } from "@/lib/utils/formatDate";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | Date;
  relatedType?: string | null;
  relatedId?: string | null;
  link?: string | null;
}

export function NotificationsClient() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const { t, isRTL } = useTranslation();

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
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        window.dispatchEvent(new Event("notificationsUpdated"));
        toast.success("All notifications marked as read");
      }
    } catch (error) {
      toast.error("Failed to mark all as read");
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch("/api/notifications?all=true", {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications([]);
        window.dispatchEvent(new Event("notificationsUpdated"));
        toast.success("All notifications cleared");
        setIsClearAllDialogOpen(false);
      }
    } catch (error) {
      toast.error("Failed to clear notifications");
      setIsClearAllDialogOpen(false);
    }
  };

  const deleteOne = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
        window.dispatchEvent(new Event("notificationsUpdated"));
        toast.success("Notification removed");
      }
    } catch (error) {
      toast.error("Failed to remove notification");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isRTL ? "sm:flex-row-reverse text-right" : ""}`}>
        <div>
          <h1 className="text-[20px] font-bold text-gray-900 dark:text-white">{t("nav.notifications" as any)}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">Manage your platform alerts and updates.</p>
        </div>
        <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          {notifications.length > 0 && (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={markAllRead}
                className="text-[11px] h-8"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
                Mark All Read
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsClearAllDialogOpen(true)}
                className="text-[11px] h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-4">
        {notifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center">
            <div className="h-12 w-12 bg-gray-50 dark:bg-slate-800 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="h-6 w-6" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet.</p>
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`group relative rounded-xl border px-5 py-4 transition-all duration-200
                ${item.isRead 
                  ? "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 opacity-80" 
                  : "bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800/50 shadow-sm shadow-indigo-50 dark:shadow-indigo-900/10"
                }`}
            >
              <div className={`flex items-start gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                <div className={`mt-1 ${item.isRead ? "text-gray-300 dark:text-gray-600" : "text-indigo-600 dark:text-indigo-400"}`}>
                  {item.isRead ? <Circle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className={`flex items-center justify-between gap-4 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <h2 className={`text-sm font-bold ${item.isRead ? "text-gray-600 dark:text-gray-300" : "text-gray-900 dark:text-white"}`}>
                      {item.title}
                    </h2>
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-medium">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  
                  <p className={`text-[13px] leading-relaxed ${item.isRead ? "text-gray-500 dark:text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                    {item.message}
                  </p>
                  
                  {item.link && (
                    <div className={`mt-3 flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <a 
                        href={item.link}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1 rounded transition-colors"
                      >
                        View Details
                      </a>
                      {item.relatedType && (
                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[10px] rounded uppercase font-bold tracking-tight border border-gray-200 dark:border-slate-700">
                          {item.relatedType}
                        </span>
                      )}
                    </div>
                  )}
                  
                  {!item.link && item.relatedType && (
                    <div className={`mt-3 flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                      <span className="px-2 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[10px] rounded uppercase font-bold tracking-tight border border-gray-200 dark:border-slate-700">
                        {item.relatedType}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteOne(item.id)}
                  className={`p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all
                    ${isRTL ? "mr-2" : "ml-2"}`}
                  title="Remove"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              
              {!item.isRead && (
                <div className={`absolute top-0 bottom-0 w-1 bg-indigo-600 rounded-full
                  ${isRTL ? "right-0" : "left-0"}`} 
                />
              )}
            </div>
          ))
        )}
      </div>

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
