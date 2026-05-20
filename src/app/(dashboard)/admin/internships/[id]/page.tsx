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
   Briefcase,
   RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { DocumentList } from "@/components/documents/DocumentList";
import { InternshipDocument } from "@/types/document";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";

interface Internship {
   id: string;
   topic: {
      title: string;
      description: string;
      companyName?: string;
      type?: string;
      internshipType?: string | null;
      targetLevels?: string | null;
      requiredSkills?: string | null;
      filiere?: { id: string; name: string; code?: string } | null;
      proposedBy: { name: string; email?: string; role?: string }
   };
   teacher: {
      name: string;
      email: string;
      grade?: string | null;
      speciality?: string | null;
      filiereName?: string | null;
   };
   students: {
      isLeader?: boolean;
      student: {
         name: string;
         email: string;
         studentId?: string;
         level?: string | null;
         studentNumber?: string | null;
         promotion?: string | null;
         filiereName?: string | null;
      }
   }[];
   status: string;
   academicYear: string;
   internshipType?: string | null;
   startDate?: string;
   endDate?: string;
   midtermDeadline?: string | null;
   finalDeadline?: string | null;
   technicalSupervisorName?: string;
   technicalSupervisorEmail?: string;
   teacherValidatedFinalReport?: boolean;
   companyValidatedFinalReport?: boolean;
   createdAt: string;
}

export default function AdminInternshipDetailPage() {
   const { id } = useParams();
   const { data: session } = useSession();
   const [internship, setInternship] = useState<Internship | null>(null);
   const [documents, setDocuments] = useState<InternshipDocument[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [deadlineInput, setDeadlineInput] = useState("");
   const [isSettingDeadline, setIsSettingDeadline] = useState(false);
   const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
   const [isCompleting, setIsCompleting] = useState(false);
   const [showRevisionModal, setShowRevisionModal] = useState(false);
   const [revisionComment, setRevisionComment] = useState("");
   const [isRequestingRevision, setIsRequestingRevision] = useState(false);
   const { setLabel } = useBreadcrumbs();

   const fetchData = async () => {
      try {
         const res = await fetch(`/api/internships/${id}`);
         const data = await res.json();
         setInternship(data.data);
         // Pre-fill deadline input if already set
         if (data.data?.finalDeadline) {
            setDeadlineInput(data.data.finalDeadline.split('T')[0]);
         }
         if (data.data?.topic?.title) {
            setLabel(id as string, data.data.topic.title);
         }

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
      // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────
      const previousInternship = internship ? { ...internship } : null;
      setInternship(prev => prev ? { ...prev, status: "DOCUMENT_SENT" } : null);

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
         setInternship(previousInternship);
         toast.error(error.message);
      }
   };

   const handleConfirmCompletion = async () => {
      setIsCompleting(true);
      try {
         const res = await fetch(`/api/internships/${id}/complete`, { method: "POST" });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to confirm completion");
         toast.success(data.message || "Internship confirmed as completed");
         setShowCompleteConfirm(false);
         fetchData();
      } catch (error: any) {
         toast.error(error.message);
      } finally {
         setIsCompleting(false);
      }
   };

   const handleRequestRevision = async () => {
      if (revisionComment.trim().length < 10) {
         toast.error("Please provide a meaningful revision comment (min 10 characters).");
         return;
      }
      setIsRequestingRevision(true);
      try {
         const res = await fetch(`/api/internships/${id}/revision`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment: revisionComment.trim() }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error || "Failed to request revision");
         toast.success(data.message || "Revision requested. The student has been notified.");
         setShowRevisionModal(false);
         setRevisionComment("");
         fetchData();
      } catch (error: any) {
         toast.error(error.message);
      } finally {
         setIsRequestingRevision(false);
      }
   };

   const handleReview = async (docId: string, status: "APPROVED" | "REJECTED", comment: string) => {
      // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────
      const previousDocuments = [...documents];
      setDocuments(prev => prev.map(d => d.id === docId ? { ...d, status, reviewComment: comment } : d));

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
         setDocuments(previousDocuments);
         toast.error("Failed to process document review");
      }
   };

   const handleSetDeadline = async () => {
      if (!deadlineInput) { toast.error("Please select a deadline date"); return; }
      
      // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────
      const previousInternship = internship ? { ...internship } : null;
      const isoDate = new Date(deadlineInput).toISOString();
      setInternship(prev => prev ? { ...prev, finalDeadline: isoDate } : null);

      setIsSettingDeadline(true);
      try {
         const res = await fetch(`/api/internships/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ finalDeadline: isoDate }),
         });
         const data = await res.json();
         if (!res.ok) throw new Error(data.error);
         toast.success(data.message);
         fetchData();
      } catch (error: any) {
         setInternship(previousInternship);
         toast.error(error.message || "Failed to set deadline");
      } finally {
         setIsSettingDeadline(false);
      }
   };

   const generateConvention = async () => {
      if (!internship) return;
      try {
         const res = await fetch(`/api/internships/${internship.id}/convention`);
         if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || "Failed to generate convention");
         }
         const blob = await res.blob();
         const url = URL.createObjectURL(blob);
         const link = document.createElement("a");
         link.href = url;
         link.download = `convention_${internship.id}.pdf`;
         link.click();
         URL.revokeObjectURL(url);
         toast.success("Convention generated successfully");
      } catch (err: any) {
         toast.error(err?.message || "Failed to generate convention");
      }
   };

   if (isLoading) return <div className="p-8 text-center text-gray-400">Loading details...</div>;
   if (!internship) return <div className="p-8 text-center text-gray-400">Internship not found.</div>;

   return (
      <div className="space-y-6 max-w-7xl mx-auto print-container">
         <div className="flex items-center justify-between no-print">
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
               {!session?.user?.isSuperAdmin && internship.status === "REQUESTED" && (
                  <Button size="sm" className="bg-sky-600 hover:bg-sky-700" onClick={markAsSent}>
                     <CheckCircle2 className="h-4 w-4 mr-2" />
                     Mark as Sent
                  </Button>
               )}
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                     <StatusBadge status={internship.status} />
                     <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{internship.academicYear}</span>
                  </div>
                  <h1 className="text-[20px] font-bold text-gray-900 dark:text-white mb-4">{internship.topic.title}</h1>
                  <p className="text-[14px] text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                     {internship.topic.description}
                  </p>

                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-gray-100 dark:border-slate-800">
                     <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Academic Supervisor</label>
                        <div className="flex items-center gap-2">
                           <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-[11px]">
                              {internship.teacher.name.charAt(0)}
                           </div>
                           <div className="flex flex-col">
                              <span className="text-[13px] font-medium text-gray-900 dark:text-white">{internship.teacher.name}</span>
                              {(internship.teacher.grade || internship.teacher.filiereName) && (
                                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                   {[internship.teacher.grade, internship.teacher.filiereName].filter(Boolean).join(" · ")}
                                </span>
                              )}
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Host Organization</label>
                        <div className="flex items-center gap-2">
                           <Building2 className="h-4 w-4 text-gray-400" />
                           <span className="text-[13px] font-medium text-gray-900 dark:text-white">
                              {internship.topic.companyName
                                 || (internship.topic.proposedBy?.role === "COMPANY" ? internship.topic.proposedBy.name : null)
                                 || "N/A"}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Team & topic targeting */}
               <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
                  <h2 className="text-[14px] font-bold text-gray-900 dark:text-white mb-4 flex items-center justify-between">
                     <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-indigo-500" />
                        Team & Topic Targeting
                     </div>
                     <span className="text-[11px] font-medium text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded">
                        {internship.students.length === 1 ? "Solo" : `${internship.students.length}-person team`}
                     </span>
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Members</label>
                        <ul className="space-y-2">
                           {internship.students.map((s) => (
                              <li key={s.student.email} className="flex items-center gap-2 text-[13px]">
                                 <div className="h-7 w-7 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-200 flex items-center justify-center font-bold text-[11px]">
                                    {s.student.name.charAt(0)}
                                 </div>
                                 <div className="flex flex-col">
                                    <span className="text-gray-900 dark:text-white font-medium">
                                       {s.student.name}
                                       {s.isLeader && (
                                          <span className="ml-2 text-[9px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-1 py-0.5 rounded uppercase">
                                             Leader
                                          </span>
                                       )}
                                    </span>
                                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                                       {[
                                          s.student.studentNumber && `#${s.student.studentNumber}`,
                                          s.student.level,
                                          s.student.filiereName,
                                       ].filter(Boolean).join(" · ")}
                                    </span>
                                 </div>
                              </li>
                           ))}
                        </ul>
                     </div>
                     <div className="space-y-3">
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Department (Filière)</label>
                           <p className="text-[13px] text-gray-900 dark:text-white">
                              {internship.topic.filiere?.name || "—"}
                           </p>
                        </div>
                        <div>
                           <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Target Levels</label>
                           <div className="flex flex-wrap gap-1">
                              {(internship.topic.targetLevels?.split(",").map((s) => s.trim()).filter(Boolean) || []).map((lvl) => (
                                 <span key={lvl} className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                                    {lvl}
                                 </span>
                              ))}
                              {!internship.topic.targetLevels && (
                                 <span className="text-[12px] text-gray-400">—</span>
                              )}
                           </div>
                        </div>
                        {internship.topic.requiredSkills && (
                           <div>
                              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Required Skills</label>
                              <p className="text-[12px] text-gray-700 dark:text-gray-300">{internship.topic.requiredSkills}</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>

               {!session?.user?.isSuperAdmin && (
                 <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
                    <h2 className="text-[14px] font-bold text-gray-900 dark:text-white mb-6 flex items-center justify-between">
                       <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-indigo-500" />
                          Internship Documents
                       </div>
                       <span className="text-[11px] font-medium text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded">
                          {documents.length} Files
                       </span>
                    </h2>
                    {/* Admin watches the document list (view + download)
                        but doesn't approve/reject — that's the supervisor's
                        responsibility. Final-report admin confirmation
                        happens through a dedicated panel below, not here. */}
                    <DocumentList documents={documents} canReview={false} />
                 </div>
               )}
            </div>

               <div className="space-y-6">
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm">
                     <h3 className="text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Internship Status</h3>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between text-[13px]">
                           <span className="text-gray-500 dark:text-gray-400">Creation Date</span>
                           <span className="text-gray-900 dark:text-white">{format(new Date(internship.createdAt), "PP")}</span>
                        </div>
                        <div className="flex items-center justify-between text-[13px]">
                           <span className="text-gray-500 dark:text-gray-400">Academic Year</span>
                           <span className="text-gray-900 dark:text-white font-medium">{internship.academicYear}</span>
                        </div>
                        {internship.internshipType && (
                           <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500 dark:text-gray-400">Type</span>
                              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                                 internship.internshipType === 'PFE' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                              }`}>{internship.internshipType}</span>
                           </div>
                        )}
                        {internship.midtermDeadline && (
                           <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500 dark:text-gray-400">Mid-Report Deadline</span>
                              <span className="text-gray-900 dark:text-white font-medium">{format(new Date(internship.midtermDeadline), "PP")}</span>
                           </div>
                        )}
                        {internship.finalDeadline && (
                           <div className="flex items-center justify-between text-[13px]">
                              <span className="text-gray-500 dark:text-gray-400">Final Deadline</span>
                              <span className="text-indigo-700 dark:text-indigo-400 font-bold">{format(new Date(internship.finalDeadline), "PP")}</span>
                           </div>
                        )}
                        {internship.startDate && (
                          <>
                            <div className="pt-2 border-t border-gray-50 dark:border-slate-800 mt-2">
                               <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Duration</span>
                               <div className="flex items-center gap-2 text-[13px] text-gray-900 dark:text-white">
                                  <Calendar className="h-4 w-4 text-indigo-500" />
                                  {format(new Date(internship.startDate), "PP")} — {internship.endDate ? format(new Date(internship.endDate), "PP") : "..."}
                               </div>
                            </div>
                            {internship.technicalSupervisorName && (
                               <div className="pt-2 mt-2 border-t border-gray-50 dark:border-slate-800">
                                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Technical Supervisor</span>
                                  <div className="text-[13px] text-gray-900 dark:text-white">
                                     <p className="font-medium">{internship.technicalSupervisorName}</p>
                                     <p className="text-gray-500 dark:text-gray-400 text-[11px]">{internship.technicalSupervisorEmail}</p>
                                  </div>
                               </div>
                            )}
                          </>
                        )}
                     </div>
                  </div>

                  {/* Final Report Panel (Admin) — visible through the whole
                      final-report lifecycle so the admin always sees where it
                      is, not just at the confirmation step. */}
                  {!session?.user?.isSuperAdmin &&
                   ["FINAL_REPORT_SUBMITTED", "PENDING_ADMIN_CONFIRMATION", "NEEDS_REVISION"].includes(internship.status) && (() => {
                     const teacherOk = !!internship.teacherValidatedFinalReport;
                     const companyOk = !!internship.companyValidatedFinalReport;
                     const bothOk = teacherOk && companyOk;
                     const readyToConfirm = internship.status === "PENDING_ADMIN_CONFIRMATION" && bothOk;

                     const Row = ({ ok, label }: { ok: boolean; label: string }) => (
                        <div className="flex items-center gap-2 text-[12px] text-gray-700 dark:text-gray-300">
                           {ok ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                           ) : (
                              <Clock className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
                           )}
                           {label} — {ok ? "validated" : "pending"}
                        </div>
                     );

                     return (
                        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/40 rounded-md p-5 shadow-sm">
                           <h3 className="text-[12px] font-bold text-indigo-800 dark:text-indigo-400 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Final Report Validation
                           </h3>
                           <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                              {internship.status === "NEEDS_REVISION"
                                 ? "The report was sent back. The student must submit a revised version, then the supervisor and company validate again."
                                 : readyToConfirm
                                 ? "The supervisor and the company have both validated. Confirm to officially complete and archive the internship, or send it back for revision."
                                 : "Both the supervisor and the company must validate before you can confirm completion."}
                           </p>
                           <div className="space-y-2 mb-4">
                              <Row ok={teacherOk} label="Supervisor" />
                              <Row ok={companyOk} label="Company" />
                           </div>
                           <div className="space-y-2">
                              <Button
                                 size="sm"
                                 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
                                 onClick={() => setShowCompleteConfirm(true)}
                                 disabled={!readyToConfirm}
                                 title={readyToConfirm ? "" : "Available once both parties validate"}
                              >
                                 <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                 Confirm Completion
                              </Button>
                              {internship.status !== "NEEDS_REVISION" && (
                                 <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => setShowRevisionModal(true)}
                                 >
                                    <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                    Request Revision
                                 </Button>
                              )}
                           </div>
                        </div>
                     );
                  })()}

                  {/* Set Final Deadline Panel (Admin Action) — PFE final
                      deadline is owned globally by the super admin via the
                      system-wide PFE end date, so dept admins see a locked
                      read-only notice instead of the editor for PFE rows. */}
                  {!session?.user?.isSuperAdmin && internship.status !== 'COMPLETED' && internship.status !== 'CANCELLED' && internship.internshipType === 'PFE' && (
                     <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm">
                        <h3 className="text-[12px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                           <Clock className="h-3.5 w-3.5" />
                           Final Report Deadline
                        </h3>
                        <p className="text-[12px] text-gray-600 dark:text-gray-400 leading-relaxed">
                           The final report deadline for <strong>PFE</strong> internships is set system-wide by the super administrator
                           (<em>Admin Settings → PFE end date</em>). It cannot be edited per-internship.
                        </p>
                        {internship.finalDeadline && (
                           <p className="mt-3 text-[13px] text-gray-900 dark:text-white">
                              Current deadline: <strong>{format(new Date(internship.finalDeadline), 'PP')}</strong>
                           </p>
                        )}
                     </div>
                  )}
                  {!session?.user?.isSuperAdmin && internship.status !== 'COMPLETED' && internship.status !== 'CANCELLED' && internship.internshipType !== 'PFE' && (
                     <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/30 rounded-md p-5 shadow-sm">
                        <h3 className="text-[12px] font-bold text-amber-800 dark:text-amber-500 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                           <Clock className="h-3.5 w-3.5" />
                           Set Final Report Deadline
                        </h3>
                        <div className="space-y-3">
                           <input
                              type="date"
                              className="admin-input text-[13px]"
                              value={deadlineInput}
                              onChange={(e) => setDeadlineInput(e.target.value)}
                           />
                           <Button
                              size="sm"
                              className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                              onClick={handleSetDeadline}
                              isLoading={isSettingDeadline}
                              disabled={!deadlineInput}
                           >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                              {internship.finalDeadline ? 'Update Deadline' : 'Set Deadline'}
                           </Button>
                        </div>
                     </div>
                  )}

                  <div className="bg-indigo-600 dark:bg-indigo-900/40 border border-transparent dark:border-indigo-800/50 rounded-md p-5 text-white shadow-lg">
                     <FileText className="h-6 w-6 mb-4 text-indigo-200 dark:text-indigo-400" />
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
                        <li className={`flex items-center gap-2 ${internship.finalDeadline ? 'text-white' : 'text-indigo-200'}`}>
                           {internship.finalDeadline ? <CheckCircle2 className="h-4 w-4 text-green-300" /> : <Clock className="h-4 w-4" />}
                           Final Deadline {internship.finalDeadline ? 'Set ✓' : 'Pending'}
                        </li>
                        <li className="flex items-center gap-2 text-indigo-200">
                           <Clock className="h-4 w-4" />
                           Pending Convention Signature
                        </li>
                     </ul>
                  </div>
               </div>
         </div>

         <ConfirmDialog
            isOpen={showCompleteConfirm}
            onClose={() => setShowCompleteConfirm(false)}
            onConfirm={handleConfirmCompletion}
            title="Confirm Internship Completion"
            description="This officially marks the internship as COMPLETED and archives it. All parties will be notified. This action cannot be undone."
            confirmLabel="Confirm Completion"
            variant="warning"
            isLoading={isCompleting}
         />

         <Modal
            isOpen={showRevisionModal}
            onClose={() => {
               if (!isRequestingRevision) {
                  setShowRevisionModal(false);
                  setRevisionComment("");
               }
            }}
            title="Request Revision"
            footer={
               <>
                  <Button
                     variant="outline"
                     onClick={() => {
                        setShowRevisionModal(false);
                        setRevisionComment("");
                     }}
                     disabled={isRequestingRevision}
                  >
                     Cancel
                  </Button>
                  <Button
                     onClick={handleRequestRevision}
                     isLoading={isRequestingRevision}
                     disabled={revisionComment.trim().length < 10}
                  >
                     Send Back for Revision
                  </Button>
               </>
            }
         >
            <div className="space-y-3">
               <p className="text-[13px] text-gray-600 dark:text-gray-300">
                  This resets both validation gates — the student must resubmit, and the
                  supervisor and company must validate again. Explain what needs to change:
               </p>
               <textarea
                  className="w-full min-h-[120px] text-[13px] p-3 border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
                  placeholder="Reason for revision (min 10 characters)…"
                  value={revisionComment}
                  onChange={(e) => setRevisionComment(e.target.value)}
                  autoFocus
               />
            </div>
         </Modal>
      </div>
   );
}
