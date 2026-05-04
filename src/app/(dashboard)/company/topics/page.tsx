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
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Topic {
  id: string;
  title: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  createdAt: string;
  _count?: { applications: number };
}

export default function CompanyTopicsPage() {
  const { t, isRTL } = useTranslation();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicToDeleteId, setTopicToDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
        throw new Error("Failed to delete topic");
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("topics.myTopics")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("common.appSubtitle")}</p>
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
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">{t("common.loading")}</div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">
            <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p>{t("topics.noTopics")}</p>
            <Link href="/company/topics/new" className="text-indigo-600 text-[13px] font-medium hover:underline mt-2 inline-block">
              {t("topics.propose")}
            </Link>
          </div>
        ) : (
          topics.map((topic) => (
            <div key={topic.id} className="bg-white border border-gray-200 rounded-md p-5 hover:border-indigo-300 transition-all shadow-sm group">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={topic.status} />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{topic.academicYear}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center text-[12px] text-gray-600">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>{t("topics.maxStudents")}: {topic.maxStudents}</span>
                    </div>
                    <div className="flex items-center text-[12px] text-gray-600">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>{t("common.date")}: {new Date(topic.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-4">
                   <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition-all">
                        <Edit className="h-4 w-4" />
                      </button>
                       <button 
                         onClick={() => handleDeleteTopic(topic.id)}
                         className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-md transition-all"
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
        description={t("errors.serverError")}
        isLoading={isDeleting}
      />
    </div>
  );
}
