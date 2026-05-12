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

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${className}`}>
    {children}
  </span>
);

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
}

interface Teacher {
  id: string;
  name: string;
}

import { useBreadcrumbs } from "@/lib/contexts/BreadcrumbContext";

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
  
  // Editable fields for advanced moderation
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicRes, teachersRes, filieresRes] = await Promise.all([
          fetch(`/api/topics/${id}`).then(r => r.json()),
          fetch("/api/users?role=TEACHER").then(r => r.json()),
          fetch("/api/filieres").then(r => r.json())
        ]);
        
        const data = topicRes.data || topicRes;
        setTopic(data);
        setTeachers(teachersRes.data || []);
        setFilieres(filieresRes.data || []);
        
        // Register breadcrumb label
        if (data?.title && id) {
          setLabel(id as string, data.title);
        }

        const levels = data.targetLevels ? data.targetLevels.split(",").filter(Boolean) : [];
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
      } catch (error) {
        toast.error("Failed to load topic details");
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
    // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────
    const previousTopic = topic ? { ...topic } : null;
    const previousEditData = { ...editData };

    if (overrideData && topic) {
      // Optimistically apply specific actions
      if (overrideData.approvePendingEdit && topic.pendingEditData) {
        const newData = JSON.parse(topic.pendingEditData);
        setTopic(prev => prev ? { ...prev, ...newData, pendingEditData: null, pendingEditRequestedAt: null } : null);
        setEditData(prev => ({ ...prev, ...newData }));
      } else if (overrideData.rejectPendingEdit) {
        setTopic(prev => prev ? { ...prev, pendingEditData: null, pendingEditRequestedAt: null } : null);
      } else if (overrideData.teacherId) {
        const teacher = teachers.find(t => t.id === overrideData.teacherId);
        setTopic(prev => prev ? { ...prev, assignedTeacherId: overrideData.teacherId, assignedTeacher: teacher || null, status: overrideData.status || prev.status } : null);
        setEditData(prev => ({ ...prev, teacherId: overrideData.teacherId, status: overrideData.status || prev.status }));
      }
    }

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
      
      if (!overrideData) {
        if (editData.title && id) {
          setLabel(id as string, editData.title);
        }
        setTopic(result.data);
      } else {
        setTopic(result.data);
      }
      
      // router.refresh() can be slow, we rely on setTopic for immediate feel
      // router.refresh(); 
      
      if (editData.status === "REJECTED" || editData.status === "OPEN_FOR_SELECTION") {
        if (!overrideData) router.push("/admin/topics");
      }
    } catch (error) {
      // Rollback
      setTopic(previousTopic);
      setEditData(previousEditData);
      toast.error("Failed to update topic");
    } finally {
      setIsUpdating(false);
    }
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
          className="inline-flex items-center gap-2 text-[13px] text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("common.back")}
        </Link>

        {!session?.user?.isSuperAdmin && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(true)}
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-100"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t("common.delete")}
            </Button>
            <Button 
              onClick={handleUpdate} 
              isLoading={isUpdating}
              size="sm"
              className="shadow-md"
            >
              {t("common.save")}
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1 space-y-6">
          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <StatusBadge status={topic.status} />
                 <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{topic.academicYear}</span>
               </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-500 uppercase">{t("topics.title")} <span className="text-red-500">*</span></label>
                  <input 
                    className="admin-input font-semibold text-[16px]" 
                    value={editData.title}
                    onChange={(e) => setEditData({...editData, title: e.target.value})}
                    disabled={session?.user?.isSuperAdmin}
                  />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-500 uppercase">{t("topics.list.description")} <span className="text-red-500">*</span></label>
                <textarea 
                  className="admin-input min-h-[150px] text-[14px] leading-relaxed py-3"
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  disabled={session?.user?.isSuperAdmin}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md shadow-sm">
             <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
               <h3 className="text-[14px] font-bold text-gray-900 flex items-center">
                  <Layers className="h-4 w-4 mr-2 text-indigo-500" />
                  Topic Configuration
               </h3>
             </div>
             
             <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{t("common.status")}</label>
                    <select 
                      className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                      value={editData.status}
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                      disabled={session?.user?.isSuperAdmin}
                    >
                      <option value="PENDING_ADMIN">Waiting Review</option>
                      <option value="PENDING_TEACHER">Waiting Supervisor Approval</option>
                      <option value="OPEN_FOR_SELECTION">Approved & Open for Selection</option>
                      <option value="REJECTED">Rejected</option>
                      {editData.status === "TAKEN" && <option value="TAKEN" disabled>Assigned to Students (Taken)</option>}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Type</label>
                    <select 
                      className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                      value={editData.type}
                      onChange={(e) => setEditData({...editData, type: e.target.value})}
                      disabled={session?.user?.isSuperAdmin}
                    >
                      <option value="STUDENT_PROPOSED">Student Initiative</option>
                      <option value="COMPANY_PROPOSED">Company Partnership</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Capacity</label>
                    <input 
                      type="number"
                      className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                      value={editData.maxStudents}
                      onChange={(e) => setEditData({...editData, maxStudents: parseInt(e.target.value)})}
                      disabled={session?.user?.isSuperAdmin}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-gray-100">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Academic Supervisor</label>
                    <select 
                      className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500"
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
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Filière</label>
                    <select 
                      className="w-full text-[13px] p-2 border border-gray-200 rounded-md focus:ring-1 focus:ring-indigo-500"
                      value={editData.filiereId}
                      onChange={(e) => setEditData({...editData, filiereId: e.target.value})}
                      disabled={session?.user?.isSuperAdmin}
                    >
                      <option value="">Select Filière...</option>
                      {filieres.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block mb-2">Target Study Levels</label>
                  <div className="flex flex-wrap gap-2">
                    {studyLevels.map(level => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => !session?.user?.isSuperAdmin && toggleLevel(level)}
                        className={`px-4 py-1.5 rounded-md text-[12px] font-bold transition-all ${
                          selectedLevels.includes(level)
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        } ${session?.user?.isSuperAdmin ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
             </div>

             {editData.status === "REJECTED" && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                   <label className="text-[12px] font-bold text-red-700 flex items-center mb-2">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Rejection Reason
                   </label>
                   <textarea 
                     className="admin-input border-red-100 bg-red-50 text-red-900"
                     value={topic.rejectionReason || ""}
                     placeholder="Provide details on why this topic was rejected..."
                     readOnly
                   />
                </div>
             )}

             {topic.pendingEditData && (
               <div className="mt-8 pt-8 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-[13px] font-bold text-amber-700 flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Pending Edit Request from Proposer
                    </h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      Requested {topic.pendingEditRequestedAt ? format(new Date(topic.pendingEditRequestedAt), "MMM d, HH:mm") : "Recently"}
                    </span>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(JSON.parse(topic.pendingEditData)).map(([key, value]) => (
                        <div key={key} className="space-y-1">
                          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-tighter">{key}</p>
                          <p className="text-[13px] text-gray-700 bg-white/50 px-2 py-1 rounded border border-amber-100 min-h-[1.5rem]">
                            {typeof value === 'string' ? value : JSON.stringify(value)}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleUpdate({ approvePendingEdit: true })}
                        className="bg-green-600 hover:bg-green-700 shadow-sm"
                      >
                        Approve Changes
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => handleUpdate({ rejectPendingEdit: true })}
                        className="text-red-600 border-red-100 hover:bg-red-50"
                      >
                        Reject Changes
                      </Button>
                    </div>
                  </div>
               </div>
             )}
          </div>

          {/* Student Applications Section */}
          {session?.user?.role === "ADMIN" && (topic as any).studentApplications && (topic as any).studentApplications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
               <div className="border-b border-gray-100 bg-green-50/30 px-6 py-4">
                 <h3 className="text-[14px] font-bold text-gray-900 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-green-600" />
                    Student Team Applications
                    <span className="ml-2 px-2 py-0.5 bg-green-600 text-white text-[10px] rounded-full">{(topic as any).studentApplications.length}</span>
                 </h3>
               </div>
               <div className="divide-y divide-gray-50">
                 {(topic as any).studentApplications.map((app: any) => (
                   <div key={app.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                     <div className="flex items-start gap-3">
                       <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                         <Users className="h-5 w-5 text-gray-400" />
                       </div>
                       <div>
                         <div className="flex flex-wrap items-center gap-1">
                           {app.team?.members?.map((m: any, index: number) => (
                             <React.Fragment key={m.id}>
                               {index > 0 && <span className="text-gray-300 mx-1">&</span>}
                               <p className="text-[13px] font-bold text-gray-900">
                                 {m.student.name} {m.isLeader && "(L)"}
                               </p>
                             </React.Fragment>
                           ))}
                         </div>
                         <p className="text-[11px] text-gray-400">Applied on {format(new Date(app.appliedAt), "MMM d, yyyy")}</p>
                         <div className="flex items-center gap-2 mt-1">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${app.team?.members?.length > 1 ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-gray-50 text-gray-600 border border-gray-100"}`}>
                             {app.team?.members?.length} Member(s)
                           </span>
                           {topic.type === "COMPANY_PROPOSED" && (
                             <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                               app.status === "ACCEPTED" ? "bg-green-50 text-green-600 border border-green-100" :
                               app.status === "REJECTED" ? "bg-red-50 text-red-600 border border-red-100" :
                               "bg-amber-50 text-amber-600 border border-amber-100"
                             }`}>
                               Company: {app.status}
                             </span>
                           )}
                         </div>
                       </div>
                     </div>
                     {app.message && (
                       <div className="w-full mt-3 bg-indigo-50/50 border border-indigo-100 rounded-lg p-3">
                         <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-1">Motivation Letter</p>
                         <p className="text-[12px] text-gray-600 whitespace-pre-wrap">{app.message}</p>
                       </div>
                     )}
                     <div className="flex gap-2 mt-3 sm:mt-0">
                       <Button 
                         size="sm" 
                         className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                         title={topic.type === "COMPANY_PROPOSED" && app.status !== "ACCEPTED" ? "Waiting for Company Validation" : "Approve & Create Internship"}
                         onClick={async () => {
                           if (!topic.assignedTeacherId) {
                             toast.error("Please assign a supervisor before approving a team.");
                             return;
                           }
                           setIsUpdating(true);
                           try {
                             const studentIds = app.team.members.map((m: any) => m.studentId);

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

                             if (!res.ok) {
                               const error = await res.json();
                               throw new Error(error.error || "Failed to approve team");
                             }

                             toast.success("Team approved and internship created!");
                             router.push("/admin/internships");
                           } catch (err: any) {
                             toast.error(err.message);
                           } finally {
                             setIsUpdating(false);
                           }
                         }}
                         isLoading={isUpdating}
                         disabled={topic.status === "TAKEN" || (topic.type === "COMPANY_PROPOSED" && app.status !== "ACCEPTED")}
                       >
                         {topic.status === "TAKEN" ? "Already Assigned" : "Approve & Create Internship"}
                       </Button>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {/* Teacher Applications Section */}
          {session?.user?.role === "ADMIN" && (topic as any).teacherApplications && (topic as any).teacherApplications.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
               <div className="border-b border-gray-100 bg-indigo-50/30 px-6 py-4">
                 <h3 className="text-[14px] font-bold text-gray-900 flex items-center">
                    <GraduationCap className="h-4 w-4 mr-2 text-indigo-500" />
                    Supervision Requests
                    <span className="ml-2 px-2 py-0.5 bg-indigo-600 text-white text-[10px] rounded-full">{(topic as any).teacherApplications.length}</span>
                 </h3>
               </div>
               <div className="divide-y divide-gray-50">
                 {(topic as any).teacherApplications.map((app: any) => (
                   <div key={app.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                     <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-[12px]">
                         {app.teacher.name.charAt(0)}
                       </div>
                       <div>
                         <p className="text-[13px] font-bold text-gray-900">{app.teacher.name}</p>
                         <p className="text-[11px] text-gray-400">{format(new Date(app.appliedAt), "MMM d, HH:mm")}</p>
                       </div>
                     </div>
                     <Button 
                       size="sm" 
                       variant="outline" 
                       className="text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                       onClick={() => handleUpdate({ teacherId: app.teacherId, status: "OPEN_FOR_SELECTION" })}
                       isLoading={isUpdating}
                       disabled={topic.assignedTeacherId === app.teacherId}
                     >
                       {topic.assignedTeacherId === app.teacherId ? "Assigned" : "Assign Supervisor"}
                     </Button>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="w-full lg:w-80 space-y-4">
           <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm space-y-6">
              <div>
                 <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Proposed By</p>
                 <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-[13px]">
                       {topic.proposedBy.name.charAt(0)}
                    </div>
                    <div>
                       <p className="text-[13px] font-bold text-gray-900">{topic.proposedBy.name}</p>
                       <p className="text-[11px] text-gray-500 truncate max-w-[140px]">{topic.proposedBy.email}</p>
                    </div>
                 </div>
              </div>

              <div className="pt-6 border-t border-gray-50">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Topic Stats</p>
                <div className="space-y-3">
                   <div className="flex items-center justify-between text-[13px]">
                      <span className="text-gray-500 flex items-center">
                         <Users className="h-3.5 w-3.5 mr-2 text-gray-400" />
                         Max Students
                      </span>
                      <span className="font-bold text-gray-900">{topic.maxStudents}</span>
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
    </div>
  );
}
