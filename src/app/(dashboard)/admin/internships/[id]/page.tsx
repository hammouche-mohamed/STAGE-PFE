"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  FileText, 
  Download, 
  Printer, 
  User, 
  Building2, 
  Calendar,
  CheckCircle2,
  Clock,
  Briefcase
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";

interface Internship {
  id: string;
  topic: { 
    title: string; 
    description: string;
    companyName?: string;
    proposedBy: { name: string }
  };
  teacher: { name: string; email: string };
  students: { student: { name: string; email: string; studentId: string } }[];
  status: string;
  academicYear: string;
  startDate?: string;
  endDate?: string;
  createdAt: string;
}

export default function AdminInternshipDetailPage() {
  const { id } = useParams();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInternship = async () => {
      try {
        const res = await fetch(`/api/internships/${id}`);
        const data = await res.json();
        setInternship(data.data);
      } catch (error) {
        toast.error("Failed to load internship details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchInternship();
  }, [id]);

  const generateConvention = () => {
    if (!internship) return;
    
    const content = `
      INTERNSHIP CONVENTION
      ---------------------
      Academic Year: ${internship.academicYear}
      Topic: ${internship.topic.title}
      
      STUDENT(S):
      ${internship.students.map(s => `- ${s.student.name} (${s.student.studentId})`).join("\n")}
      
      ACADEMIC SUPERVISOR:
      ${internship.teacher.name}
      
      HOST ORGANIZATION:
      ${internship.topic.companyName || "N/A"}
      
      Generated on: ${format(new Date(), "PPP")}
    `;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Convention_${internship.id}.txt`;
    link.click();
    toast.success("Convention generated successfully");
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading details...</div>;
  if (!internship) return <div className="p-8 text-center text-gray-400">Internship not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/internships"
          className="inline-flex items-center gap-2 text-[13px] text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to monitoring
        </Link>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print Page
          </Button>
          <Button size="sm" onClick={generateConvention}>
            <Download className="h-4 w-4 mr-2" />
            Generate Convention
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <StatusBadge status={internship.status} />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{internship.academicYear}</span>
            </div>
            <h1 className="text-[20px] font-bold text-gray-900 mb-4">{internship.topic.title}</h1>
            <p className="text-[14px] text-gray-600 leading-relaxed mb-6">
              {internship.topic.description}
            </p>
            
            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100">
               <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Academic Supervisor</label>
                  <div className="flex items-center gap-2">
                     <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[11px]">
                        {internship.teacher.name.charAt(0)}
                     </div>
                     <span className="text-[13px] font-medium text-gray-900">{internship.teacher.name}</span>
                  </div>
               </div>
               <div>
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Host Organization</label>
                  <div className="flex items-center gap-2">
                     <Building2 className="h-4 w-4 text-gray-400" />
                     <span className="text-[13px] font-medium text-gray-900">{internship.topic.companyName || "N/A"}</span>
                  </div>
               </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
             <h2 className="text-[14px] font-bold text-gray-900 mb-6 flex items-center">
                <Users className="h-4 w-4 mr-2 text-indigo-500" />
                Assigned Students
             </h2>
             <div className="space-y-4">
                {internship.students.map((s) => (
                   <div key={s.student.email} className="flex items-center justify-between p-3 border border-gray-50 rounded-lg bg-gray-50/50">
                      <div className="flex items-center gap-3">
                         <div className="h-9 w-9 rounded bg-white border border-gray-100 text-gray-400 flex items-center justify-center">
                            <User className="h-5 w-5" />
                         </div>
                         <div>
                            <p className="text-[13px] font-bold text-gray-900">{s.student.name}</p>
                            <p className="text-[11px] text-gray-500">{s.student.email}</p>
                         </div>
                      </div>
                      <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">ID: {s.student.studentId}</span>
                   </div>
                ))}
             </div>
          </div>
        </div>

        <div className="space-y-6">
           <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
              <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-wide mb-4">Internship Status</h3>
              <div className="space-y-4">
                 <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Creation Date</span>
                    <span className="text-gray-900">{format(new Date(internship.createdAt), "PP")}</span>
                 </div>
                 <div className="flex items-center justify-between text-[13px]">
                    <span className="text-gray-500">Academic Year</span>
                    <span className="text-gray-900 font-medium">{internship.academicYear}</span>
                 </div>
              </div>
           </div>

           <div className="bg-indigo-600 rounded-md p-5 text-white shadow-lg">
              <FileText className="h-6 w-6 mb-4 text-indigo-200" />
              <h3 className="text-[15px] font-bold">Admin Checklist</h3>
              <ul className="mt-4 space-y-3 text-[12px]">
                 <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-300" />
                    Topic Approved
                 </li>
                 <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-indigo-300" />
                    Supervisor Assigned
                 </li>
                 <li className="flex items-center gap-2 text-indigo-200">
                    <Clock className="h-4 w-4" />
                    Pending Convention Signature
                 </li>
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}
