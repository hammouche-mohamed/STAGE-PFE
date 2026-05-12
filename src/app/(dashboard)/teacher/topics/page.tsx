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
  assignedTeacherId: string | null;
  teacherApplications?: { id: string; status: string }[];
}

export default function TeacherTopicsPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<"MY" | "MARKETPLACE">("MY");
  const [availableTopics, setAvailableTopics] = useState<Topic[]>([]);
  const [isApplying, setIsApplying] = useState<string | null>(null);

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      const allTopics = data.data || [];
      
      const myId = (session as any)?.user?.id;

      // My Supervisions: Assigned to me or I applied
      setTopics(allTopics.filter((t: any) => 
        t.assignedTeacherId === myId || 
        (t.teacherApplications && t.teacherApplications.length > 0)
      ));

      // Available: Not assigned and I haven't applied
      setAvailableTopics(allTopics.filter((t: any) => 
        t.assignedTeacherId === null && 
        (!t.teacherApplications || t.teacherApplications.length === 0) &&
        t.status === "APPROVED"
      ));
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("common.topics")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("dashboard.browseTopics")}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("MY")}
          className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === "MY" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
        >
          {t("nav.supervision")}
        </button>
        <button
          onClick={() => setActiveTab("MARKETPLACE")}
          className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${activeTab === "MARKETPLACE" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}
        >
          {t("topics.title")}
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("common.topics")}</th>
              <th>{t("topics.maxStudents")}</th>
              <th>{t("common.status")}</th>
              <th>{t("common.date")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">{t("common.loading")}</td></tr>
            ) : (activeTab === "MY" ? topics : availableTopics).length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="h-8 w-8 text-gray-200 dark:text-slate-800" />
                    <p>{activeTab === "MY" ? "No supervisions or applications yet." : "No topics available for supervision in your department."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              (activeTab === "MY" ? topics : availableTopics).map((topic) => (
                <tr key={topic.id} className="admin-table-row group">
                  <td data-label="Topic">
                    <div className="flex flex-col gap-1 text-right sm:text-left">
                      <span className="font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {topic.title}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{topic.academicYear}</span>
                    </div>
                  </td>
                  <td data-label="Capacity">
                    <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                      <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-[13px] text-gray-600 dark:text-gray-300">{topic.maxStudents}</span>
                    </div>
                  </td>
                  <td data-label="Status">
                    {activeTab === "MY" && topic.teacherApplications && topic.teacherApplications.length > 0 && !topic.assignedTeacherId ? (
                      <StatusBadge status="PENDING" text="Application Pending" />
                    ) : (
                      <StatusBadge status={topic.assignedTeacherId === (session as any)?.user?.id ? "APPROVED" : topic.status} text={topic.assignedTeacherId === (session as any)?.user?.id ? "Supervising" : undefined} />
                    )}
                  </td>
                  <td data-label="Date">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">{new Date(topic.createdAt).toLocaleDateString()}</span>
                  </td>
                  <td data-label="Actions" className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {activeTab === "MY" ? (
                        <Link href={`/teacher/internships`}>
                          <Button size="sm" variant="ghost" className="h-8 text-[11px] font-bold">
                            {t("common.view")} <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </Link>
                      ) : (
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="h-8 text-[11px] font-bold"
                          onClick={() => handleApply(topic.id)}
                          isLoading={isApplying === topic.id}
                        >
                          {t("topics.apply", { defaultValue: "Supervise" })}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
