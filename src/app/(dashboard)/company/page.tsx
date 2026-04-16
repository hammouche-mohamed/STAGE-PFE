import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  Plus, 
  BookOpen, 
  Users, 
  Briefcase,
  ArrowRight,
  TrendingUp,
  LayoutDashboard
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function CompanyDashboardPage() {
  // Hardcoded company ID for simulation (Sonatrach from seed)
  const company = await prisma.user.findUnique({
    where: { email: "contact@sonatrach.dz" },
    include: { companyProfile: true }
  });

  if (!company) return <div>Company profile not found.</div>;

  const [
    topicCount,
    applicationCount,
    internshipCount
  ] = await Promise.all([
    prisma.topic.count({ where: { proposedById: company.id } }),
    prisma.studentApplication.count({ 
      where: { 
        topic: { proposedById: company.id },
        status: "PENDING"
      } 
    }),
    prisma.internship.count({ 
      where: { 
        topic: { proposedById: company.id }
      } 
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Partner Dashboard</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Welcome back, {company.companyProfile?.companyName}. Manage your recruitment and internship tracks.</p>
        </div>
        <Link href="/company/topics/new" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[12px] font-medium flex items-center hover:bg-indigo-700 transition-colors">
          <Plus className="h-4 w-4 mr-1" />
          New Topic
        </Link>
      </div>

      {/* Company Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          label="Total Topics" 
          value={topicCount} 
          icon={BookOpen}
          subValue="Proposed on portal"
        />
        <StatsCard 
          label="Active Applications" 
          value={applicationCount} 
          icon={Users}
          subValue="Waiting recruitment"
          subValueColor={applicationCount > 0 ? "indigo" as any : "gray"}
        />
        <StatsCard 
          label="Current Interns" 
          value={internshipCount} 
          icon={Briefcase}
          subValue="Working with you"
          subValueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Topic Performance */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" />
            Topic Visibility
          </h2>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-600 font-medium truncate max-w-[70%]">Optimisation de la chaîne logistique via l'IA</span>
                <span className="text-gray-400">12 applications</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-500 rounded-full" style={{ width: "85%" }}></div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-600 font-medium truncate max-w-[70%]">Analyse de données de forage</span>
                <span className="text-gray-400">4 applications</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-300 rounded-full" style={{ width: "25%" }}></div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-gray-50 flex justify-center">
            <Link href="/company/topics" className="text-[12px] font-bold text-indigo-600 uppercase tracking-wide hover:underline">
              View Publication details
            </Link>
          </div>
        </div>

        {/* Recruitment Quick Look */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <h2 className="text-[14px] font-semibold text-gray-900 mb-6 flex items-center">
            <LayoutDashboard className="h-4 w-4 mr-2 text-indigo-600" />
            Recruitment Funnel
          </h2>
          
          <div className="space-y-4">
             <div className="flex items-center gap-4 p-3 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-[12px]">LM</div>
                <div className="flex-1">
                   <p className="text-[13px] font-medium text-gray-900">Lydia Mansouri</p>
                   <p className="text-[10px] text-gray-500">SIQ Student • GPA: 15.4/20</p>
                </div>
                <Link href="/company/applications" className="p-1.5 text-gray-400 hover:text-indigo-600">
                   <ArrowRight className="h-4 w-4" />
                </Link>
             </div>
             <div className="flex items-center gap-4 p-3 rounded-md hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100 cursor-pointer">
                <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center text-green-700 font-bold text-[12px]">YB</div>
                <div className="flex-1">
                   <p className="text-[13px] font-medium text-gray-900">Yacine Belkacem</p>
                   <p className="text-[10px] text-gray-500">GL Student • GPA: 14.8/20</p>
                </div>
                <Link href="/company/applications" className="p-1.5 text-gray-400 hover:text-indigo-600">
                   <ArrowRight className="h-4 w-4" />
                </Link>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
