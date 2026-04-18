"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";
import { Bell, User as UserIcon, LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { labels } = useBreadcrumbs();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications?count=true");
        if (!res.ok) {
          throw new Error(`Failed to fetch notifications: ${res.status}`);
        }
        const text = await res.text();
        if (!text) {
          setUnreadCount(0);
          return;
        }
        const data = JSON.parse(text);
        setUnreadCount(data.count ?? 0);
      } catch (error) {
        console.error("Failed to load notification count", error);
        setUnreadCount(0);
      }
    };
    fetchCount();
  }, []);

  const paths = pathname.split("/").filter(Boolean);
  const getCurrentTitle = () => {
    const lastSegment = paths[paths.length - 1];
    if (labels[lastSegment]) return labels[lastSegment];
    return lastSegment?.charAt(0).toUpperCase() + lastSegment?.slice(1).replace(/-/g, " ") || "Dashboard";
  };

  const displayName = session?.user?.name ?? "John Doe";
  const email = session?.user?.email ?? "john.doe@esst-sup.com";
  const avatarUrl = session?.user?.image;
  const initials = displayName
    .split(" ")
    .map((segment: string) => segment[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-[56px] fixed top-0 right-0 left-[240px] bg-white border-b border-gray-200 z-40 flex items-center justify-between px-6">
      <div className="flex flex-col">
        <h1 className="text-[15px] font-medium text-gray-900 leading-tight">
          {getCurrentTitle()}
        </h1>
        <div className="flex items-center text-[11px] text-gray-400 mt-0.5">
          <span>Home</span>
          {paths.map((p, i) => (
            <React.Fragment key={p}>
              <span className="mx-1.5">/</span>
              <span className={i === paths.length - 1 ? "text-gray-500" : ""}>
                {labels[p] || (p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, " "))}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-5">
        <Link href="/notifications" className="relative text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="h-[20px] w-[20px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-[3px] bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="h-[32px] w-px bg-gray-200 mx-2" />

        <div className="flex items-center">
          <button 
            onClick={() => setIsLogoutDialogOpen(true)}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all cursor-pointer"
            title="Logout"
          >
            <LogOut className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        onClose={() => setIsLogoutDialogOpen(false)}
        onConfirm={() => signOut({ callbackUrl: "/" })}
        title="Confirm Logout"
        description="Are you sure you want to sign out? Any unsaved changes on the current page may be lost."
        confirmLabel="Logout"
        variant="danger"
      />
    </header>
  );
};
