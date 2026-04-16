import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  Users, 
  Briefcase, 
  FileText, 
  MessageSquare,
  ArrowRight,
  Plus,
  Clock
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { DocumentList } from "@/components/documents/DocumentList";

export default async function TeacherDashboardPage() {
  // Hardcoded teacher ID for simulation (Teacher 1 from seed)
  const teacher = await prisma.user.findUnique({
    where: { email: "m.amine@esst.dz" },
    include: { teacherProfile: true }
  });

  if (!teacher) return <div>Teacher profile not found.</div>;

  const [
    internshipCount,
    pendingApplications,
    pendingDocuments,
    unreadMessages
  ] = await Promise.all([
    prisma.internship.count({ where: { teacherId: teacher.id } }),
    prisma.teacherApplication.count({ where: { teacherId: teacher.id, status: "PENDING" } }),
    prisma.document.count({ 
      where: { 
        internship: { teacherId: teacher.id },
        status: "UPLOADED"
      } 
    }),
    prisma.message.count({ 
      where: { 
        internship: { teacherId: teacher.id },
        requiresAction: true,
        actionStatus: "PENDING"
      } 
    })
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Teacher Workspace</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Welcome back, {teacher.name}. Monitor your student supervisions and academic progress.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/teacher/topics/new" className="px-3 py-1.5 bg-indigo-600 text-white rounded-md text-[12px] font-medium flex items-center hover:bg-indigo-700 transition-colors">
            <Plus className="h-4 w-4 mr-1" />
            Propose Topic
          </Link>
        </div>
      </div>

      {/* Teacher Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Active Supervisions" 
          value={internshipCount} 
          icon={Briefcase}
          subValue={`${teacher.teacherProfile?.maxStudents || 5} max capacity`}
        />
        <StatsCard 
          label="Topic Applications" 
          value={pendingApplications} 
          icon={Users}
          subValue="Waiting review"
          subValueColor={pendingApplications > 0 ? "red" : "gray"}
        />
        <StatsCard 
          label="Reports to Review" 
          value={pendingDocuments} 
          icon={FileText}
          subValue="Pending approval"
          subValueColor={pendingDocuments > 0 ? "amber" as any : "gray"}
        />
        <StatsCard 
          label="Urgent Messages" 
          value={unreadMessages} 
          icon={MessageSquare}
          subValue="Action required"
          subValueColor={unreadMessages > 0 ? "red" : "gray"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Supervisions List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900 flex items-center">
              <Clock className="h-4 w-4 mr-2 text-indigo-600" />
              Active Internships
            </h2>
            <Link href="/teacher/internships" className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="bg-white border border-gray-200 rounded-md shadow-sm divide-y divide-gray-100">
             {/* This would ideally be a component, but for now we list directly */}
             <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer">
               <div className="flex items-center gap-4">
                 <div className="h-10 w-10 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[13px]">
                   AR
                 </div>
                 <div>
                   <p className="text-[14px] font-medium text-gray-900">Anis Rahmani</p>
                   <p className="text-[11px] text-gray-500 uppercase tracking-tight">Plateforme de gestion de télémédecine</p>
                 </div>
               </div>
               <div className="flex items-center gap-6">
                 <div className="text-right">
                   <p className="text-[10px] text-gray-400 font-medium">NEXT MILESTONE</p>
                   <p className="text-[12px] text-amber-600 font-semibold">Mid-term Report</p>
                 </div>
                 <div className="h-8 w-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-600">
                    <ArrowRight className="h-4 w-4" />
                 </div>
               </div>
             </div>
          </div>
        </div>

        {/* Sidebar helper for teacher */}
        <div className="space-y-4">
           <h2 className="text-[14px] font-semibold text-gray-900 flex items-center">
              Resources
            </h2>
            <div className="bg-white border border-gray-200 rounded-md p-4 space-y-3 shadow-sm">
               <div className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                  <p className="text-[13px] font-medium text-gray-900">Template: Final Report</p>
                  <p className="text-[11px] text-gray-500">Official ESST PFE template (.docx)</p>
               </div>
               <div className="p-3 bg-gray-50 rounded-md border border-gray-100 hover:border-indigo-200 transition-colors cursor-pointer group">
                  <p className="text-[13px] font-medium text-gray-900">Grading Policy 2024</p>
                  <p className="text-[11px] text-gray-500">How to evaluate reports & defenses.</p>
               </div>
            </div>
        </div>
      </div>
    </div>
  );
}
