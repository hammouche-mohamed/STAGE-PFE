"use client";

import React from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BreadcrumbProvider } from "@/lib/contexts/BreadcrumbContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // TODO: Fetch real role from session
  const role: "ADMIN" | "STUDENT" | "TEACHER" | "COMPANY" = "ADMIN";

  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Fixed */}
      <Sidebar role={role} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-[240px]">
        {/* Topbar - Fixed height, sticky or fixed */}
        <Topbar />

        {/* Content - Scrollable container */}
        <main className="mt-[56px] p-6 min-h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
      </div>
    </BreadcrumbProvider>
  );
}
