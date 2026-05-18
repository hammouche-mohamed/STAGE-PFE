import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import CompanyDashboardClient from "./CompanyDashboardClient";

export default async function CompanyDashboardPage() {
  // NFR-M3 / NFR-S2: use the authenticated session — never hardcode user IDs or emails
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-gray-400">Session not found.</div>;

  const company = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      companyprofile: { select: { companyName: true } },
    },
  } as any);

  if (!company) return <div className="p-8 text-gray-400">Company profile not found.</div>;

  let stats = { topicCount: 0, applicationCount: 0, internshipCount: 0, pendingValidations: 0 };
  try {
    const [topicCount, applicationCount, internshipCount, pendingValidations] =
      await Promise.all([
        prisma.topic.count({ where: { proposedById: company.id, archivedAt: null } }),
        prisma.studentApplication.count({
          where: {
            topic: { proposedById: company.id },
            status: "PENDING",
          },
        }),
        prisma.internship.count({
          where: { topic: { proposedById: company.id } },
        }),
        // Final reports awaiting the company's own validation
        prisma.internship.count({
          where: {
            topic: { proposedById: company.id },
            status: "FINAL_REPORT_SUBMITTED",
            companyValidatedFinalReport: false,
          },
        }),
      ]);
    stats = { topicCount, applicationCount, internshipCount, pendingValidations };
  } catch (err: any) {
    console.error("[COMPANY_DASHBOARD] Fetching stats failed:", err);
    // Continue with zero stats but log it
  }

  const { topicCount, applicationCount, internshipCount, pendingValidations } = stats;

  return (
    <CompanyDashboardClient
      companyName={(company as any).companyprofile?.companyName ?? company.name}
      topicCount={topicCount}
      applicationCount={applicationCount}
      internshipCount={internshipCount}
      pendingValidations={pendingValidations}
    />
  );
}
