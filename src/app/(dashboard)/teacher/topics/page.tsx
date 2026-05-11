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
  Edit,
  Trash2,
  ChevronRight
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Topic {
  id: string;
  title: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  createdAt: string;
}

export default function TeacherTopicsPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [activeTab, setActiveTab] = useState<"MY" | "MARKETPLACE">("MY");
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [isApplying, setIsApplying] = useState<string | null>(null);

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      const allTopics = data.data || [];
      
      // Separate my topics from available ones
      setTopics(allTopics.filter((t: any) => t.proposedById === (session as any)?.user?.id || t.assignedTeacherId === (session as any)?.user?.id));
      setAvailableTopics(allTopics.filter((t: any) => t.proposedById !== (session as any)?.user?.id && t.assignedTeacherId !== (session as any)?.user?.id && t.status === "APPROVED"));
    } catch (error) {
      toast.error(t("toast.loadTopicsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchTopics();
  }, [session]);

  const handleApply = async (topicId: string) => {
    setIsApplying(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/apply-supervision`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to apply");
      
      toast.success("Supervision application sent to Admin");
      fetchTopics();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApplying(null);
    }
  };

  const handleDelete = async () => {
    if (!topicToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${topicToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete topic");
      }

      toast.success(t("toast.topicDeleted"));
      setTopics(prev => prev.filter(t => t.id !== topicToDelete.id));
      setTopicToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Could not delete topic");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("topics.title", { defaultValue: "Internship Topics" })}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("topics.subtitle", { defaultValue: "Manage your supervisions and discover new topics" })}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("MY")}
          className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === "MY" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
        >
          {t("topics.myTopics")}
        </button>
        <button
          onClick={() => setActiveTab("MARKETPLACE")}
          className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === "MARKETPLACE" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
        >
          {t("topics.marketplace", { defaultValue: "Available Topics" })}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">{t("common.loading")}</div>
        ) : (activeTab === "MY" ? topics : availableTopics).length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">
            <BookOpen className="h-10 w-10 text-gray-200 dark:text-slate-800 mx-auto mb-3" />
            <p>{activeTab === "MY" ? t("topics.noTopics") : "No topics available for supervision in your department."}</p>
          </div>
        ) : (
          (activeTab === "MY" ? topics : availableTopics).map((topic) => (
            <div key={topic.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all shadow-sm group">
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
                    <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-400">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                       <span>{t("topics.maxStudents")}: {topic.maxStudents}</span>
                    </div>
                    <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-400">
                      <div className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
                        <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                        <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-4">
                   {activeTab === "MY" ? (
                     <div className="flex items-center gap-2">
                        <button className="p-2 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-all">
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => setTopicToDelete(topic)}
                          className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                     </div>
                   ) : (
                     <Button 
                       size="sm" 
                       onClick={() => handleApply(topic.id)}
                       isLoading={isApplying === topic.id}
                     >
                       {t("topics.apply", { defaultValue: "Supervise" })}
                     </Button>
                   )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <ConfirmDialog
        isOpen={!!topicToDelete}
        onClose={() => setTopicToDelete(null)}
        onConfirm={handleDelete}
        title={t("common.delete")}
        description={`${t("common.delete")} "${topicToDelete?.title}"?`}
        confirmLabel={t("common.delete")}
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
