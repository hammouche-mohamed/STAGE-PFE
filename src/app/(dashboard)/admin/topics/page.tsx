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
import { useSession } from "next-auth/react";
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
  const { data: session } = useSession();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filiereFilter, setFiliereFilter] = useState("ALL");
  const [assignmentFilter, setAssignmentFilter] = useState("ALL");
  const [filieres, setFilieres] = useState<any[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchFilieres = async () => {
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      setFilieres(data.data || []);
    } catch (error) {
      console.error("Failed to load filieres");
    }
  };

  const fetchTopics = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      // Admins manage topics across all years — don't lock to current system year
      params.append("academicYear", "all");
      if (filiereFilter !== "ALL") params.append("filiereId", filiereFilter);
      if (assignmentFilter !== "ALL") params.append("assigned", assignmentFilter === "ASSIGNED" ? "true" : "false");
      
      const res = await fetch(`/api/topics?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setApiError(data.error || `API Error ${res.status}`);
        setTopics([]);
      } else {
        setTopics(data.data || []);
      }
    } catch (error: any) {
      const msg = error?.message || "Network error";
      setApiError(msg);
      if (!silent) toast.error(t("toast.loadFailed"));
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [t, filiereFilter, assignmentFilter]);

  const handleDelete = async () => {
    if (!topicToDelete) return;
    
    // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────
    const previousTopics = [...topics];
    const deletedId = topicToDelete.id;
    
    setTopics(prev => prev.filter(t => t.id !== deletedId));
    setTopicToDelete(null);
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${deletedId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete topic");
      
      toast.success("Topic deleted successfully");
      fetchTopics(true); // Silent sync
    } catch (error: any) {
      // Rollback on error
      setTopics(previousTopics);
      toast.error(error.message || "Could not delete topic");
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchTopics();
    fetchFilieres();

    // Auto-poll every 30 seconds for real-time updates
    const pollId = setInterval(() => fetchTopics(true), 30000);
    return () => clearInterval(pollId);
  }, [fetchTopics]);

  const filteredTopics = topics.filter(t => {
    const proposedByName = t.proposedBy?.name || '';
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         proposedByName.toLowerCase().includes(search.toLowerCase());
    
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
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("common.topics")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("topics.pendingApproval")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-slate-800 overflow-x-auto overflow-y-hidden whitespace-nowrap scrollbar-hide">
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
                ? "border-indigo-600 text-indigo-700 dark:text-indigo-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-slate-700"
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
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {session?.user?.isSuperAdmin && (
            <select 
              className="admin-input min-w-0 sm:min-w-[180px] w-full sm:w-auto"
              value={filiereFilter}
              onChange={(e) => setFiliereFilter(e.target.value)}
            >
              <option value="ALL">All Departments</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <select 
            className="admin-input min-w-0 sm:min-w-[150px] w-full sm:w-auto"
            value={assignmentFilter}
            onChange={(e) => setAssignmentFilter(e.target.value)}
          >
            <option value="ALL">All Assignments</option>
            <option value="ASSIGNED">Assigned Only</option>
            <option value="UNASSIGNED">Unassigned Only</option>
          </select>
        </div>
      </div>

      {/* Topics List - Using Cards for better detail display */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md">{t("common.loading")}</div>
        ) : apiError ? (
          <div className="text-center py-12 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-[13px] font-semibold text-red-600 dark:text-red-400">API Error</p>
            <p className="text-[12px] text-red-500 dark:text-red-300 mt-1">{apiError}</p>
            <button onClick={() => fetchTopics()} className="mt-3 text-[12px] text-indigo-600 hover:underline">Retry</button>
          </div>
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
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-4 hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] block"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-6 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={topic.status} />
                    {topic.pendingEditData && (
                       <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded flex items-center">
                         <AlertCircle className="h-3 w-3 mr-1" />
                         PENDING EDIT
                       </span>
                    )}
                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{topic.academicYear}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {topic.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3">
                    <div className="flex items-center text-[12px] text-gray-500 dark:text-gray-400">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                      <span className="font-medium text-gray-700 dark:text-gray-200">{topic.proposedBy.name}</span>
                      <span className="mx-1 text-gray-300 dark:text-gray-700">•</span>
                      <span className="text-[11px] uppercase">{topic.type.replace('_', ' ')}</span>
                    </div>
                    {topic.assignedTeacher && (
                      <div className="flex items-center text-[12px] text-gray-500 dark:text-gray-400">
                        <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                        <span>Supervised by: {topic.assignedTeacher.name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-[12px] text-gray-500 dark:text-gray-400">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400 dark:text-gray-500" />
                      <span>Capacity: {topic.maxStudents} {topic.maxStudents > 1 ? "students" : "student"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 self-center">
                  <div className="flex items-center gap-2">
                    {!session?.user?.isSuperAdmin && (
                      <button 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTopicToDelete(topic);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                        title="Delete topic"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                    <ChevronRight className={`h-5 w-5 text-gray-300 dark:text-slate-600 group-hover:text-indigo-500 transition-all ${
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

