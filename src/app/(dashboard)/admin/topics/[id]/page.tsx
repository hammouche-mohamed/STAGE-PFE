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

interface Topic {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  maxStudents: number;
  academicYear: string;
  proposedBy: { id: string; name: string; email: string };
  assignedTeacher?: { id: string; name: string } | null;
  rejectionReason?: string;
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
    teacherId: ""
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [topicRes, teachersRes] = await Promise.all([
          fetch(`/api/topics/${id}`).then(r => r.json()),
          fetch("/api/users?role=TEACHER").then(r => r.json())
        ]);
        
        const data = topicRes.data || topicRes;
        setTopic(data);
        setTeachers(teachersRes.data || []);
        
        // Register breadcrumb label
        if (data?.title && id) {
          setLabel(id as string, data.title);
        }

        setEditData({
          title: data.title,
          description: data.description,
          status: data.status,
          type: data.type,
          maxStudents: data.maxStudents,
          teacherId: data.assignedTeacherId || ""
        });
      } catch (error) {
        toast.error("Failed to load topic details");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [id, setLabel]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      if (!res.ok) throw new Error("Update failed");
      
      toast.success("Topic updated successfully");
      
      // Update local breadcrumb if title changed
      if (editData.title && id) {
        setLabel(id as string, editData.title);
      }
      
      router.refresh();
      // If status changed significantly, maybe go back
      if (editData.status === "REJECTED" || editData.status === "OPEN_FOR_SELECTION") {
        router.push("/admin/topics");
      }
    } catch (error) {
      toast.error("Failed to update topic");
    } finally {
      setIsUpdating(false);
    }
  };

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
                <label className="text-[12px] font-bold text-gray-500 uppercase">{t("topics.title")}</label>
                <input 
                  className="admin-input font-semibold text-[16px]" 
                  value={editData.title}
                  onChange={(e) => setEditData({...editData, title: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-500 uppercase">{t("common.name")}</label>
                <textarea 
                  className="admin-input min-h-[150px] text-[14px] leading-relaxed py-3"
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
             <h3 className="text-[13px] font-bold text-indigo-900 uppercase tracking-wide mb-6 flex items-center">
                <Layers className="h-4 w-4 mr-2" />
                Advanced Moderation Controls
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">{t("common.status")}</label>
                  <select 
                    className="admin-input"
                    value={editData.status}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                  >
                    <option value="PENDING_ADMIN">Waiting Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="OPEN_FOR_SELECTION">Open for Selection</option>
                    <option value="TAKEN">Assigned to Group</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Proposal Type</label>
                  <select 
                    className="admin-input"
                    value={editData.type}
                    onChange={(e) => setEditData({...editData, type: e.target.value})}
                  >
                    <option value="STUDENT_PROPOSED">Student Initiative</option>
                    <option value="COMPANY_PROPOSED">Company Partnership</option>
                    <option value="TEACHER_PROPOSED">Faculty Proposed</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Capacity (Students)</label>
                  <input 
                    type="number"
                    className="admin-input"
                    value={editData.maxStudents}
                    onChange={(e) => setEditData({...editData, maxStudents: parseInt(e.target.value)})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[12px] font-bold text-gray-700">Academic Supervisor</label>
                  <select 
                    className="admin-input"
                    value={editData.teacherId}
                    onChange={(e) => setEditData({...editData, teacherId: e.target.value})}
                  >
                    <option value="">No Supervisor Assigned</option>
                    {teachers.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
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
          </div>
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
