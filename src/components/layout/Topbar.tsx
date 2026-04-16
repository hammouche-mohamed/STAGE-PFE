"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";
import { Bell, Search, LogOut } from "lucide-react";

export const Topbar: React.FC = () => {
  const pathname = usePathname();
  const { labels } = useBreadcrumbs();

  // Simple breadcrumb logic
  const paths = pathname.split("/").filter(Boolean);
  
  // Get formatted title for the current page
  const getCurrentTitle = () => {
    const lastSegment = paths[paths.length - 1];
    if (labels[lastSegment]) return labels[lastSegment];
    return lastSegment?.charAt(0).toUpperCase() + lastSegment?.slice(1).replace(/-/g, " ") || "Dashboard";
  };

  const formattedTitle = getCurrentTitle();

  return (
    <header className="h-[56px] fixed top-0 right-0 left-[240px] bg-white border-b border-gray-200 z-40 flex items-center justify-between px-6">
      {/* Page Title & Breadcrumb */}
      <div className="flex flex-col">
        <h1 className="text-[15px] font-medium text-gray-900 leading-tight">
          {formattedTitle}
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

      {/* Right Side Actions */}
      <div className="flex items-center space-x-5">
        <div className="relative cursor-pointer text-gray-400 hover:text-gray-600 transition-colors">
          <Bell className="h-[20px] w-[20px]" />
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            3
          </span>
        </div>

        <div className="h-[32px] w-px bg-gray-200 mx-2" />

        <div className="flex items-center group cursor-pointer">
          <div className="flex flex-col items-end mr-3">
            <span className="text-[13px] font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">John Doe</span>
            <span className="text-[11px] text-gray-400">john.doe@esst-sup.com</span>
          </div>
          <div className="h-9 w-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[13px] font-semibold text-gray-500 overflow-hidden">
            JD
          </div>
        </div>
      </div>
    </header>
  );
};
