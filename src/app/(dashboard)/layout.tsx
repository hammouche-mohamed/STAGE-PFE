import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BreadcrumbProvider } from "@/lib/contexts/BreadcrumbContext";
import { SidebarProvider } from "@/lib/contexts/SidebarContext";
import { PollingProvider } from "@/lib/contexts/PollingContext";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// The university logo is a SystemSettings row that almost never changes.
// `unstable_cache` keeps the result in Next's data cache across requests
// (not just within one request like React's `cache`), so navigating
// between dashboard pages no longer hits the DB every time.
const getUniversityLogo = unstable_cache(
  async () => prisma.systemSettings.findUnique({ where: { key: "universityLogo" } }),
  ["dashboard-university-logo"],
  { revalidate: 600, tags: ["systemSettings"] },
);

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, logoSetting] = await Promise.all([
    auth(),
    getUniversityLogo()
  ]);
  
  const role = (session?.user?.role as "ADMIN" | "STUDENT" | "TEACHER" | "COMPANY") ?? "ADMIN";
  const baseLogoUrl = logoSetting?.value || "";
  const routedLogoUrl = baseLogoUrl.startsWith("/uploads/") ? `/api${baseLogoUrl}` : baseLogoUrl;
  const logoUrl = routedLogoUrl ? `${routedLogoUrl}${logoSetting?.updatedAt ? `?v=${logoSetting.updatedAt.getTime()}` : ""}` : "";

  return (
    <PollingProvider>
      <SidebarProvider>
        <BreadcrumbProvider>
          <div className="h-screen bg-gray-50 dark:bg-slate-950 flex overflow-hidden relative">
            {/* Sidebar - Responsive */}
            <Sidebar role={role} logoUrl={logoUrl} />

            {/* Main Content Area */}
            <div className="flex-1 min-w-0 flex flex-col transition-all duration-300 md:ltr:ml-[240px] md:rtl:mr-[240px] overflow-x-hidden">
              {/* Topbar - Fixed height */}
              <Topbar />

              {/* Content - Scrollable container */}
              <main className="flex-1 overflow-y-auto p-6 md:p-10 min-w-0 overflow-x-hidden">
                {children}
              </main>
            </div>
          </div>
        </BreadcrumbProvider>
      </SidebarProvider>
    </PollingProvider>
  );
}
