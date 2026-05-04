import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { BreadcrumbProvider } from "@/lib/contexts/BreadcrumbContext";
import { SidebarProvider } from "@/lib/contexts/SidebarContext";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = (session?.user?.role as "ADMIN" | "STUDENT" | "TEACHER" | "COMPANY") ?? "ADMIN";

  const logoSetting = await prisma.systemSettings.findUnique({
    where: { key: "universityLogo" }
  });
  const baseLogoUrl = logoSetting?.value || "";
  const routedLogoUrl = baseLogoUrl.startsWith("/uploads/") ? `/api${baseLogoUrl}` : baseLogoUrl;
  const logoUrl = routedLogoUrl ? `${routedLogoUrl}?v=${Date.now()}` : "";

  return (
    <SidebarProvider>
      <BreadcrumbProvider>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar - Responsive */}
          <Sidebar role={role} logoUrl={logoUrl} />

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col md:ltr:ml-[240px] md:rtl:mr-[240px] transition-all duration-300">
            {/* Topbar - Fixed height, sticky or fixed */}
            <Topbar />

            {/* Content - Scrollable container */}
            <main className="mt-[56px] p-3 sm:p-4 md:p-6 min-h-[calc(100vh-56px)]">
              {children}
            </main>
          </div>
        </div>
      </BreadcrumbProvider>
    </SidebarProvider>
  );
}
