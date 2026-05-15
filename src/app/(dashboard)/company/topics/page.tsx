"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  BookOpen, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";


interface Topic {
  id: string;
  title: string;
  description: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  createdAt: string;
  requiredSkills?: string;
  _count?: { applications: number };
}

export default function CompanyTopicsPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicToDeleteId, setTopicToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [topicToEdit, setTopicToEdit] = useState<Topic | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    requiredSkills: "",
    maxStudents: 1
  });

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadTopicsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const handleDeleteTopic = (id: string) => {
    setTopicToDeleteId(id);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${topicToDeleteId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete topic");
      }

      toast.success(t("toast.topicProposalDeleted"));
      setTopics(prev => prev.filter(t => t.id !== topicToDeleteId));
      setTopicToDeleteId(null);
    } catch (error: any) {
      toast.error(error.message || "An error occurred while deleting the topic");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStartEdit = async (topic: Topic) => {
    setTopicToEdit(topic);
    setEditForm({
      title: topic.title,
      description: topic.description || "",
      requiredSkills: topic.requiredSkills || "",
      maxStudents: topic.maxStudents || 1
    });
  };

  const handleEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicToEdit) return;
    
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/topics/${topicToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (!res.ok) throw new Error("Failed to submit edit request");

      toast.success("Edit request submitted for admin approval");
      setTopicToEdit(null);
      router.refresh();
      window.location.href = "/company/topics"; // Force a full state reset as requested
    } catch (error) {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("topics.myTopics")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("common.appSubtitle")}</p>
        </div>
        <Link href="/company/topics/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("topics.propose")}
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">{t("common.loading")}</div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
            <BookOpen className="h-10 w-10 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
            <p>{t("topics.noTopics")}</p>
            <Link href="/company/topics/new" className="text-indigo-600 text-[13px] font-medium hover:underline mt-2 inline-block">
              {t("topics.propose")}
            </Link>
          </div>
        ) : (
          topics.map((topic) => (
            <div key={topic.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 hover:border-indigo-300 dark:hover:border-indigo-900 transition-all shadow-sm group">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={topic.status} />
                    <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{topic.academicYear}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-900 dark:text-white leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                      <span>{t("topics.maxStudents")}: {topic.maxStudents}</span>
                    </div>
                    <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                      <span>{t("common.date")}: {new Date(topic.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-4">
                   <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleStartEdit(topic)}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-all"
                        title="Request edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                       <button 
                         onClick={() => handleDeleteTopic(topic.id)}
                         className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-all"
                         title="Delete topic"
                       >
                         <Trash2 className="h-4 w-4" />
                       </button>
                   </div>
                   <Link 
                     href={`/company/applications?topicId=${topic.id}`}
                     className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide flex items-center hover:underline"
                   >
                     View Applications
                     <ChevronRight className="ml-1 h-3 w-3" />
                   </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <ConfirmDialog
        isOpen={!!topicToDeleteId}
        onClose={() => setTopicToDeleteId(null)}
        onConfirm={confirmDeleteTopic}
        title={t("common.delete")}
        description={t("topics.confirmDelete") || "Are you sure you want to delete this topic proposal?"}
        isLoading={isDeleting}
      />

      <Modal
        isOpen={!!topicToEdit}
        onClose={() => setTopicToEdit(null)}
        title="Request Topic Edit"
        size="lg"
      >
        <form onSubmit={handleEditRequest} className="space-y-6 py-2">
           <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-4 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div className="text-[13px] text-amber-800 dark:text-amber-300 leading-relaxed">
                <p className="font-bold">Information Management Note</p>
                <p>Changes to validated topics are not immediate. Your request will be reviewed by an administrator. You will be notified once the changes are approved or rejected.</p>
              </div>
           </div>

           <div className="space-y-4">
              <Input 
                label="New Title"
                value={editForm.title}
                onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                required
              />

              <div className="space-y-2">
                <label className="text-[12px] font-bold text-gray-700 uppercase tracking-tight">New Description</label>
                <textarea 
                  className="admin-input min-h-[150px] py-3 leading-relaxed"
                  value={editForm.description}
                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                  required
                />
              </div>

              <Input 
                label="Required Skills (Optional)"
                value={editForm.requiredSkills}
                onChange={(e) => setEditForm({...editForm, requiredSkills: e.target.value})}
                placeholder="React, Node.js, SQL..."
              />
           </div>

           <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setTopicToEdit(null)}>Cancel</Button>
              <Button type="submit" isLoading={isUpdating}>Submit Request</Button>
           </div>
        </form>
      </Modal>
    </div>
  );
}
