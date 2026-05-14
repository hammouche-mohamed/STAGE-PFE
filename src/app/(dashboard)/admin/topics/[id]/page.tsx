"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  User, 
  Building2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  GraduationCap,
  Calendar,
  Layers,
  FileText,
  AlertCircle,
  Users,
  Trash2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";
import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";

interface Filiere {
  id: string;
  name: string;
  code: string;
}

interface Topic {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  maxStudents: number;
  academicYear: string;
  proposedBy: { id: string; name: string; email: string };
  assignedTeacherId?: string | null;
  assignedTeacher?: { id: string; name: string } | null;
  rejectionReason?: string;
  filiereId?: string | null;
  targetLevels?: string | null;
  filiere?: Filiere | null;
  pendingEditData?: string | null;
  pendingEditRequestedAt?: string | null;
  companyName?: string | null;
  companySector?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  proposedByStudent: boolean;
  studentApplications?: any[];
  teacherApplications?: any[];
}

interface Teacher {
  id: string;
  name: string;
}

export default function AdminTopicDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useTranslation();
  const { data: session } = useSession();
  const { setLabel } = useBreadcrumbs();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const [editData, setEditData] = useState({
    title: "",
    description: "",
    status: "",
    type: "",
    maxStudents: 1,
    teacherId: "",
    filiereId: "",
    targetLevels: ""
  });
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<string[]>([]);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReasonInput, setRejectionReasonInput] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicRes, teachersRes, filieresRes] = await Promise.all([
          fetch(`/api/topics/${id}`).then(r => r.json()),
          fetch("/api/users?role=TEACHER").then(r => r.json()),
          fetch("/api/filieres").then(r => r.json())
        ]);
        
        const data = topicRes.data || topicRes;
        
        if (topicRes.error || data?.error) {
          throw new Error(topicRes.error || data?.error || "Topic not found");
        }
        
        setTopic(data);
        setTeachers(teachersRes.data || []);
        setFilieres(filieresRes.data || []);
        
        if (data?.title && id) {
          setLabel(id as string, data.title);
        }

        const levels = data.targetLevels ? (data.targetLevels as string).split(",").filter(Boolean) : [];
        setSelectedLevels(levels);

        setEditData({
          title: data.title,
          description: data.description,
          status: data.status,
          type: data.type,
          maxStudents: data.maxStudents,
          teacherId: data.assignedTeacherId || "",
          filiereId: data.filiereId || "",
          targetLevels: data.targetLevels || ""
        });
      } catch (error: any) {
        console.error("Error fetching topic details:", error);
        toast.error(`Fetch Failed: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, setLabel]);

  useEffect(() => {
    setEditData(prev => ({ ...prev, targetLevels: selectedLevels.join(",") }));
  }, [selectedLevels]);

  const handleUpdate = async (overrideData?: any) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrideData || editData),
      });

      if (!res.ok) throw new Error("Update failed");
      
      const result = await res.json();
      toast.success(overrideData ? "Action processed successfully" : "Topic updated successfully");
      setTopic(result.data);
      
      if (!overrideData && (editData.status === "REJECTED" || editData.status === "OPEN_FOR_SELECTION")) {
         router.push("/admin/topics");
      }
    } catch (error) {
      toast.error("Failed to update topic");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApprove = () => {
    handleUpdate({ ...editData, status: "OPEN_FOR_SELECTION" });
  };

  const handleReject = () => {
    if (!rejectionReasonInput.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }
    handleUpdate({ ...editData, status: "REJECTED", rejectionReason: rejectionReasonInput });
    setIsRejectDialogOpen(false);
  };

  const toggleLevel = (level: string) => {
    setSelectedLevels(prev => 
      prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
    );
  };

  const studyLevels = ["L1", "L2", "L3", "M1", "M2"];

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Delete failed");
      }
      
      toast.success("Topic deleted successfully");
      router.push("/admin/topics");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete topic");
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-400">Loading topic details...</div>;
  if (!topic) return <div className="p-8 text-center text-gray-400">Topic not found.</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/topics"
          className="inline-flex items-center gap-2 text-[13px] text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        {session?.user?.role === "ADMIN" && !session?.user?.isSuperAdmin && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(true)}
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-100 dark:border-red-900/30 transition-colors"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
            <Button 
              onClick={() => handleUpdate()} 
              isLoading={isUpdating}
              size="sm"
              className="shadow-md"
            >
              {t("common.save")}
            </Button>
          </div>
        )}
        
        {session?.user?.isSuperAdmin && (
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-md">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center">
              <AlertCircle className="h-3.5 w-3.5 mr-1.5" />
              Monitoring Mode (Read-Only)
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <StatusBadge status={topic.status} />
                 <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{topic.academicYear}</span>
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase">{t("topics.title")} <span className="text-red-500">*</span></label>
                  <input 
                    className="admin-input font-semibold text-[16px]" 
                    value={editData.title}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    disabled={session?.user?.isSuperAdmin}
                  />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-500 dark:text-gray-400 uppercase">{t("topics.list.description")} <span className="text-red-500">*</span></label>
                <textarea 
                  className="admin-input min-h-[150px] text-[14px] leading-relaxed py-3"
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  disabled={session?.user?.isSuperAdmin}
                />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow-sm">
             <div className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 px-6 py-4">
               <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-indigo-500" />
                  {t("topics.topicInfo")}
               </h3>
             </div>
             
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t("common.status")}</label>
                    <div className="flex items-center h-10">
                      <StatusBadge status={topic.status} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t("topics.type")}</label>
                    <select 
                      className="admin-input w-full text-[13px] h-10"
                      value={editData.type}
                      onChange={(e) => setEditData({...editData, type: e.target.value})}
                      disabled={session?.user?.isSuperAdmin}
                    >
                      <option value="STUDENT_PROPOSED">Student Initiative</option>
                      <option value="COMPANY_PROPOSED">Company Partnership</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t("topics.list.capacity")}</label>
                    <input 
                      type="number"
                      className="admin-input w-full text-[13px] h-10"
                      value={editData.maxStudents}
                      onChange={(e) => setEditData({...editData, maxStudents: parseInt(e.target.value)})}
                      disabled={session?.user?.isSuperAdmin}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t("topics.list.supervisor")}</label>
                    <select 
                      className="admin-input w-full text-[13px] h-10"
                      value={editData.teacherId}
                      onChange={(e) => setEditData({...editData, teacherId: e.target.value})}
                      disabled={session?.user?.isSuperAdmin}
                    >
                      <option value="">No Supervisor Assigned</option>
                      {teachers.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">{t("common.filiere")}</label>
                    <select 
                      className="admin-input w-full text-[13px] h-10"
                      value={editData.filiereId}
                      onChange={(e) => setEditData({...editData, filiereId: e.target.value})}
                      disabled={session?.user?.isSuperAdmin}
                    >
                      <option value="">Select Filière...</option>
                      {filieres.map(f => (
                        <option key={f.id} value={f.id}>{f.name}{f.code ? ` (${f.code})` : ""}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">Target Study Levels</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {studyLevels.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => !session?.user?.isSuperAdmin && !topic.proposedByStudent && toggleLevel(level)}
                        disabled={session?.user?.isSuperAdmin || topic.proposedByStudent}
                        className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${
                          selectedLevels.includes(level)
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        } ${(session?.user?.isSuperAdmin || topic.proposedByStudent) ? "cursor-default opacity-80" : "cursor-pointer"}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                {!session?.user?.isSuperAdmin && ["PENDING_ADMIN", "PENDING_TEACHER", "REJECTED"].includes(topic.status) && (
                  <div className="mt-8 pt-8 border-t border-gray-200 dark:border-slate-800">
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[12px] font-bold uppercase tracking-wider">Moderation Actions</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button 
                          onClick={handleApprove} 
                          isLoading={isUpdating}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white border-none min-w-[140px]"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve Topic
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => setIsRejectDialogOpen(true)}
                          disabled={isUpdating}
                          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-900/30 dark:hover:bg-red-900/20 min-w-[140px]"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject Topic
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
             </div>
          </div>

          {session?.user?.role === "ADMIN" && topic.studentApplications && topic.studentApplications.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md shadow-sm overflow-hidden">
               <div className="border-b border-gray-100 dark:border-slate-800 bg-green-50/30 dark:bg-green-900/10 px-6 py-4">
                 <h3 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center">
                    <Users className="h-4 w-4 mr-2 text-green-600 dark:text-green-400" />
                    Student Team Applications
                    <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-[10px] rounded-full">{topic.studentApplications.length}</span>
                 </h3>
               </div>
               <div className="divide-y divide-gray-50 dark:divide-slate-800">
                 {topic.studentApplications.map((app: any) => (
                   <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-start gap-3">
                       <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                         <Users className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                       </div>
                       <div>
                         <div className="flex flex-wrap items-center gap-1">
                           {app.studentteam?.teammember?.map((m: any, index: number) => (
                             <React.Fragment key={m.id}>
                               {index > 0 && <span className="text-gray-300 dark:text-gray-600 mx-1">&</span>}
                               <p className="text-[13px] font-bold text-gray-900 dark:text-white">
                                 {m.user.name} {m.isLeader && "(L)"}
                               </p>
                             </React.Fragment>
                           ))}
                         </div>
                         <p className="text-[11px] text-gray-400 dark:text-gray-500">Applied on {format(new Date(app.appliedAt), "MMM d, yyyy")}</p>
                       </div>
                     </div>
                     {!session?.user?.isSuperAdmin && (
                        <Button 
                          size="sm" 
                          className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={async () => {
                            if (!topic.assignedTeacherId) {
                              toast.error("Please assign a supervisor before approving a team.");
                              return;
                            }
                            setIsUpdating(true);
                            try {
                              const studentIds = app.studentteam.teammember.map((m: any) => m.studentId);
                              const res = await fetch("/api/internships", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  topicId: topic.id,
                                  teacherId: topic.assignedTeacherId,
                                  academicYear: topic.academicYear,
                                  studentIds
                                }),
                              });
                              if (!res.ok) throw new Error("Failed to approve team");
                              toast.success("Team approved and internship created!");
                              router.push("/admin/internships");
                            } catch (err: any) {
                              toast.error(err.message);
                            } finally {
                              setIsUpdating(false);
                            }
                          }}
                          isLoading={isUpdating}
                          disabled={topic.status === "TAKEN"}
                        >
                          {topic.status === "TAKEN" ? "Already Assigned" : "Approve & Create Internship"}
                        </Button>
                     )}
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        <div className="w-full lg:w-80 space-y-4">
           <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm space-y-6">
              <div>
                 <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
                   {topic.type === "COMPANY_PROPOSED" ? "Partner Company" : "Proposed By"}
                 </p>
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-[13px]">
                       {(topic.companyName || topic.proposedBy?.name || "U").charAt(0)}
                    </div>
                    <div>
                       <p className="text-[13px] font-bold text-gray-900 dark:text-white">
                         {topic.type === "COMPANY_PROPOSED" ? (topic.companyName || "N/A") : (topic.proposedBy?.name || "Unknown Proposer")}
                       </p>
                       <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[140px]">
                         {topic.type === "COMPANY_PROPOSED" ? (topic.companySector || "Professional Sector") : (topic.proposedBy?.email || "No email")}
                       </p>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50 dark:border-slate-800">
                <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">{t("common.statistics")}</p>
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-500 dark:text-gray-400 flex items-center">
                         <Users className="h-3.5 w-3.5 mr-2 text-gray-400 dark:text-gray-500" />
                         {t("topics.list.capacity")}
                      </span>
                      <span className="font-bold text-gray-900 dark:text-white">{topic.maxStudents}</span>
                   </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t("common.delete")}
        description={`${t("common.delete")} "${topic.title}"?`}
        confirmLabel={t("common.delete")}
        variant="danger"
        isLoading={isDeleting}
      />

      <ConfirmDialog
        isOpen={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={handleReject}
        title="Reject Topic"
        description={
          <div className="space-y-4 pt-2">
            <p className="text-[13px] text-gray-500">Please provide a reason for rejecting this topic. This will be visible to the proposer.</p>
            <textarea
              className="admin-input w-full min-h-[100px] text-[13px]"
              placeholder="Reason for rejection..."
              value={rejectionReasonInput}
              onChange={(e) => setRejectionReasonInput(e.target.value)}
              autoFocus
            />
          </div>
        }
        confirmLabel="Confirm Rejection"
        variant="danger"
        isLoading={isUpdating}
      />
    </div>
  );
}
