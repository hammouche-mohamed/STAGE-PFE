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
import { DocumentList } from "@/components/documents/DocumentList";
import { InternshipDocument } from "@/types/document";

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
   technicalSupervisorName?: string;
   technicalSupervisorEmail?: string;
   createdAt: string;
}

export default function AdminInternshipDetailPage() {
   const { id } = useParams();
   const [internship, setInternship] = useState<Internship | null>(null);
   const [documents, setDocuments] = useState<InternshipDocument[]>([]);
   const [isLoading, setIsLoading] = useState(true);

   const fetchData = async () => {
      try {
         const res = await fetch(`/api/internships/${id}`);
         const data = await res.json();
         setInternship(data.data);

         const docRes = await fetch(`/api/documents?internshipId=${id}`);
         const docData = await docRes.json();
         setDocuments(docData.data || []);
      } catch (error) {
         toast.error("Failed to load internship details");
      } finally {
         setIsLoading(false);
      }
   };

   useEffect(() => {
      fetchData();
   }, [id]);

   const markAsSent = async () => {
      try {
         const res = await fetch(`/api/internships/${id}/send-document`, {
            method: "POST",
         });
         if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to mark as sent");
         }
         toast.success("Convention marked as sent to company");
         fetchData();
      } catch (error: any) {
         toast.error(error.message);
      }
   };

   const handleReview = async (docId: string, status: "APPROVED" | "REJECTED", comment: string) => {
      try {
         const res = await fetch(`/api/documents/${docId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status, reviewComment: comment }),
         });
         if (!res.ok) throw new Error("Review failed");
         toast.success(`Document ${status.toLowerCase()} successfully`);
         
         const docRes = await fetch(`/api/documents?internshipId=${id}`);
         const docData = await docRes.json();
         setDocuments(docData.data || []);
      } catch (error) {
         toast.error("Failed to process document review");
      }
   };

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
               {internship.status === "REQUESTED" && (
                  <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={markAsSent}>
                     <CheckCircle2 className="h-4 w-4 mr-2" />
                     Mark as Sent
                  </Button>
               )}
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
                  <h2 className="text-[14px] font-bold text-gray-900 mb-6 flex items-center justify-between">
                     <div className="flex items-center">
                        <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                        Internship Documents
                     </div>
                     <span className="text-[11px] font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded">
                        {documents.length} Files
                     </span>
                  </h2>
                  <DocumentList 
                     documents={documents}
                     canReview={true}
                     onReview={handleReview}
                  />
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
                     {internship.startDate && (
                       <>
                         <div className="pt-2 border-t border-gray-50 mt-2">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Duration</span>
                            <div className="flex items-center gap-2 text-[13px] text-gray-900">
                               <Calendar className="h-4 w-4 text-indigo-500" />
                               {format(new Date(internship.startDate), "PP")} — {internship.endDate ? format(new Date(internship.endDate), "PP") : "..."}
                            </div>
                         </div>
                         {internship.technicalSupervisorName && (
                            <div className="pt-2 mt-2 border-t border-gray-50">
                               <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Technical Supervisor</span>
                               <div className="text-[13px] text-gray-900">
                                  <p className="font-medium">{internship.technicalSupervisorName}</p>
                                  <p className="text-gray-500 text-[11px]">{internship.technicalSupervisorEmail}</p>
                               </div>
                            </div>
                         )}
                       </>
                     )}
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
