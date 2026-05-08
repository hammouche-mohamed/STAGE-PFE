"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Tag,
  Building2,
  Users,
  ChevronRight,
  User,
  GraduationCap,
  Trash2
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { EmptyState } from "@/components/ui/EmptyState";

interface Topic {
  id: string;
  title: string;
  type: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  proposedBy: { name: string };
  assignedTeacher?: { name: string } | null;
  createdAt: string;
  pendingEditData?: string | null;
  pendingEditRequestedAt?: string | null;
}

export default function AdminTopicsPage() {
  const { t, isRTL } = useTranslation();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTopics = useCallback(async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleDelete = async () => {
    if (!topicToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${topicToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete topic");
      
      toast.success("Topic deleted successfully");
      setTopicToDelete(null);
      fetchTopics();
    } catch (error: any) {
      toast.error(error.message || "Could not delete topic");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  const filteredTopics = topics.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         t.proposedBy.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = false;
    if (statusFilter === "ALL") matchesStatus = true;
    else if (statusFilter === "MODIFICATIONS") matchesStatus = !!t.pendingEditData;
    else matchesStatus = t.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("common.topics")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("topics.pendingApproval")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {[
          { id: "ALL", label: t("common.all") },
          { id: "PENDING_ADMIN", label: t("status.PENDING_ADMIN") },
          { id: "MODIFICATIONS", label: "Modifications" },
          { id: "APPROVED", label: t("status.APPROVED") },
          { id: "OPEN_FOR_SELECTION", label: t("status.OPEN_FOR_SELECTION") },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              statusFilter === tab.id
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Control Bar */}
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
          <input
            type="text"
            placeholder={t("common.search")}
            className={`admin-input ${isRTL ? "pr-10" : "pl-10"}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Topics List - Using Cards for better detail display */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">{t("common.loading")}</div>
        ) : filteredTopics.length === 0 ? (
          <EmptyState 
            icon={BookOpen}
            title={t("common.noData")}
            description="We couldn't find any topics matching your current filter or search criteria."
          />
        ) : (
          filteredTopics.map((topic) => (
            <Link 
              key={topic.id} 
              href={`/admin/topics/${topic.id}`}
              className="bg-white border border-gray-200 rounded-md p-4 hover:border-indigo-300 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] block"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-6 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={topic.status} />
                    {topic.pendingEditData && (
                       <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center">
                         <AlertCircle className="h-3 w-3 mr-1" />
                         PENDING EDIT
                       </span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{topic.academicYear}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {topic.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3">
                    <div className="flex items-center text-[12px] text-gray-500">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span className="font-medium text-gray-700">{topic.proposedBy.name}</span>
                      <span className="mx-1 text-gray-300">•</span>
                      <span className="text-[11px] uppercase">{topic.type.replace('_', ' ')}</span>
                    </div>
                    {topic.assignedTeacher && (
                      <div className="flex items-center text-[12px] text-gray-500">
                        <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                        <span>Supervised by: {topic.assignedTeacher.name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-[12px] text-gray-500">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>Capacity: {topic.maxStudents} {topic.maxStudents > 1 ? "students" : "student"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 self-center">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setTopicToDelete(topic);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete topic"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <ChevronRight className={`h-5 w-5 text-gray-300 group-hover:text-indigo-500 transition-all ${
                      isRTL ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1"
                    }`} />
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <ConfirmDialog
        isOpen={!!topicToDelete}
        onClose={() => setTopicToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Topic"
        description={`Are you sure you want to delete "${topicToDelete?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Topic"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

// Minimal missing component for this specific view

