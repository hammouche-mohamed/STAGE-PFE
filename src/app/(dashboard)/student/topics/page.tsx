"use client";

import React, { useEffect, useState } from "react";
import {
  Search, Building2, CheckCircle2, Loader2,
  X, AlertCircle, Users, Calendar, Tag, ChevronRight, User, Plus, GraduationCap, Lock
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";

interface Filiere { id: string; name: string; code?: string | null; }

interface Topic {
  id: string;
  title: string;
  description: string;
  type: string;
  internshipType: string;
  requiredSkills?: string | null;
  maxStudents: number;
  academicYear: string;
  targetLevels?: string | null;
  filiereId?: string | null;
  filiere?: Filiere | null;
  proposedBy: { name: string };
  assignedTeacher?: { name: string } | null;
}

const LEVELS = ["L1", "L2", "L3", "M1", "M2"] as const;

function canApply(studentLevel: string | undefined, targetLevels: string | null | undefined): boolean {
  if (!targetLevels) return true; // no restriction
  const allowed = targetLevels.split(",").map((l) => l.trim());
  return !!studentLevel && allowed.includes(studentLevel);
}

export default function StudentTopicsPage() {
  const { data: session } = useSession();
  const [topics, setTopics] = useState<Topic[]>([]);
  const { t, isRTL } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Map<string, any>>(new Map());
  const [showAppliedOnly, setShowAppliedOnly] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [applyModal, setApplyModal] = useState<{ show: boolean; topicId: string | null; letter: string }>({ show: false, topicId: null, letter: "" });
  const [alreadyModal, setAlreadyModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [filiereFilter, setFiliereFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<"ALL" | "APPLIED" | "MY_PROPOSALS">("ALL");

  const studentLevel = (session?.user as any)?.level as string | undefined;

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch("/api/topics").then(r => r.json()),
      fetch("/api/filieres").then(r => r.json()),
      fetch("/api/profile").then(r => r.json()),
      fetch("/api/applications").then(r => r.json())
    ]).then(([topicsData, filieresData, profileData, applicationsData]) => {
      const allTopics = topicsData.data || [];
      const allFilieres = filieresData.data || [];
      const studentSpec = profileData.data?.studentProfile?.speciality;

      setTopics(allTopics);
      setFilieres(allFilieres);

      if (studentSpec) {
        const matched = allFilieres.find(
          (f: Filiere) => 
            f.name.toLowerCase() === studentSpec.toLowerCase() || 
            f.code?.toLowerCase() === studentSpec.toLowerCase()
        );
        if (matched) {
          setFiliereFilter(matched.id);
        }
      }

      if (applicationsData.data) {
        const appliedMap = new Map<string, any>();
        applicationsData.data.forEach((app: any) => appliedMap.set(app.topicId, app));
        setApplied(appliedMap);
      }
    })
    .catch(() => toast.error(t("toast.loadTopicsFailed")))
    .finally(() => setIsLoading(false));
  }, []);

  const openApplyModal = (topicId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setApplyModal({ show: true, topicId, letter: "" });
  };

  const handleApply = async () => {
    if (!applyModal.topicId) return;
    
    setApplying(applyModal.topicId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: applyModal.topicId, message: applyModal.letter }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "ALREADY_IN_INTERNSHIP") {
        setApplyModal({ show: false, topicId: null, letter: "" });
        setAlreadyModal({ show: true, message: data.message });
        return;
      }
      if (!res.ok) { toast.error(data.error || "Failed to apply"); return; }
      
      setApplied((prev: Map<string, any>) => {
        const next = new Map(prev);
        next.set(applyModal.topicId as string, data.data);
        return next;
      });
      
      setSelectedTopic(null);
      setApplyModal({ show: false, topicId: null, letter: "" });
      toast.success(t("toast.applicationSubmitted"));
    } catch {
      toast.error(t("toast.networkError"));
    } finally {
      setApplying(null);
    }
  };

  const filteredTopics = React.useMemo(() => {
    return topics.filter((topic: Topic) => {
      const matchesSearch =
        topic.title.toLowerCase().includes(search.toLowerCase()) ||
        topic.proposedBy.name.toLowerCase().includes(search.toLowerCase()) ||
        topic.description?.toLowerCase().includes(search.toLowerCase());

      const matchesLevel =
        levelFilter === "ALL" ||
        !topic.targetLevels ||
        topic.targetLevels.split(",").map((l: string) => l.trim()).includes(levelFilter);

      const matchesFiliere = filiereFilter === "ALL" || topic.filiereId === filiereFilter;
      
      // Tab filtering
      if (activeTab === "APPLIED") return matchesSearch && matchesLevel && matchesFiliere && applied.has(topic.id);
      if (activeTab === "MY_PROPOSALS") return matchesSearch && (topic as any).proposedById === session?.user?.id;

      // For "ALL" tab, show public topics OR my proposals if they match other filters
      return matchesSearch && matchesLevel && matchesFiliere;
    });
  }, [topics, search, levelFilter, filiereFilter, activeTab, applied, session?.user?.id]);

  const getApplicationStatus = (topic: Topic) => {
    const app = applied.get(topic.id);
    if (!app) return null;

    if (topic.type === "COMPANY_PROPOSED") {
      if (app.status === "PENDING") {
        const appliedDate = new Date(app.appliedAt);
        const expiresAt = new Date(appliedDate.setMonth(appliedDate.getMonth() + 2));
        const daysLeft = Math.max(0, Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
        return { 
          text: `Waiting for Company Validation (${daysLeft} days left)`, 
          color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-100", 
          icon: <Loader2 className="h-4 w-4 animate-spin" />
        };
      }
      if (app.status === "ACCEPTED") {
        return { 
          text: "Moved to Admin Validation", 
          color: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-100", 
          icon: <CheckCircle2 className="h-4 w-4" />
        };
      }
    }
    return { 
      text: t("topics.list.applicationAlreadySent"), 
      color: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100", 
      icon: <CheckCircle2 className="h-4 w-4" />
    };
  };

  const skills = (t: Topic) =>
    t.requiredSkills ? t.requiredSkills.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];

  const levelBadge = (targetLevels?: string | null) => {
    if (!targetLevels) return null;
    const levels = targetLevels.split(",").map((l: string) => l.trim());
    return (
      <div className="flex flex-wrap gap-1">
        {levels.map((l: string) => (
          <span key={l} className="px-1.5 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-bold rounded border border-violet-200">
            {l}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("topics.title")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("topics.subtitle") || "Explore topics available for selection"}</p>
        </div>
        <Link href="/student/topics/propose">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            {t("topics.propose")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
          <input
            type="text"
            placeholder={t("common.search")}
            className={`admin-input ${isRTL ? "pr-10 text-right" : "pl-10"}`}
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex p-1 bg-gray-100 dark:bg-slate-800 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`px-4 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
              activeTab === "ALL" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t("common.all")}
          </button>
          <button
            onClick={() => setActiveTab("APPLIED")}
            className={`px-4 py-1.5 text-[12px] font-semibold rounded-md transition-all flex items-center gap-2 ${
              activeTab === "APPLIED" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t("nav.applications") || "Applied"}
            {applied.size > 0 && <span className="px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 rounded-full text-[9px]">{applied.size}</span>}
          </button>
          <button
            onClick={() => setActiveTab("MY_PROPOSALS")}
            className={`px-4 py-1.5 text-[12px] font-semibold rounded-md transition-all ${
              activeTab === "MY_PROPOSALS" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {t("topics.myTopics") || "My Proposals"}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" /> {t("topics.list.level")}:
        </span>
        {["ALL", ...LEVELS].map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`px-3 py-1 text-[12px] font-semibold rounded-full border transition-all ${
              levelFilter === level
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500"
            }`}
          >
            {level === "ALL" ? t("common.all") : level}
          </button>
        ))}
        {studentLevel && (
          <span className={`${isRTL ? "mr-auto" : "ml-auto"} text-[11px] text-gray-400 dark:text-gray-500`}>
            {t("topics.list.yourLevel")}: <span className="font-bold text-indigo-600 dark:text-indigo-400">{studentLevel}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-400">{t("common.loading")}</div>
        ) : filteredTopics.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">{t("topics.noTopics")}</div>
        ) : (
          filteredTopics.map((topic: Topic) => {
            const isApplied = applied.has(topic.id);
            const isApplying = applying === topic.id;
            const eligible = canApply(studentLevel, topic.targetLevels);
            const topicSkills = skills(topic);
            const status = isApplied ? getApplicationStatus(topic) : null;

            return (
              <div 
                key={topic.id} 
                className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-300 p-4 sm:p-5 flex flex-col cursor-pointer group" 
                onClick={() => setSelectedTopic(topic)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase rounded-full">
                      {topic.type === "COMPANY_PROPOSED" ? t("topics.list.company") : t("topics.list.professor")}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                      topic.internshipType === "PFE" ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                    }`}>
                      {topic.internshipType}
                    </span>
                    {topic.filiere && (
                      <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800/50">
                        {topic.filiere.code || topic.filiere.name}
                      </span>
                    )}
                    {levelBadge(topic.targetLevels)}
                  </div>

                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-3">
                    {topic.title}
                  </h3>

                  <p className="text-[13px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4">
                    {topic.description}
                  </p>

                  {topicSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {topicSkills.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] rounded">{s}</span>
                      ))}
                      {topicSkills.length > 3 && (
                        <span className="px-1.5 py-0.5 text-gray-400 dark:text-gray-500 text-[10px]">+{topicSkills.length - 3} more</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[12px] text-gray-500 dark:text-gray-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      {topic.proposedBy.name}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400 dark:text-gray-500">
                      <Users className="h-3.5 w-3.5" />
                      {topic.maxStudents} {topic.maxStudents !== 1 ? t("topics.list.students") : t("topics.list.student")}
                    </div>
                  </div>

                  {topic.assignedTeacher && (
                    <div className="flex items-center gap-1.5 text-[12px] text-gray-600 dark:text-gray-300 pt-1">
                      <GraduationCap className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span className="text-gray-400 dark:text-gray-500">{t("topics.list.supervisor")}:</span>
                      <span className="font-medium">{topic.assignedTeacher.name}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                  {isApplied ? (
                    status ? (
                      <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${status.color} border px-2 py-1 rounded`}>
                        {status.icon} {status.text}
                      </span>
                    ) : null
                  ) : !eligible ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-amber-600 dark:text-amber-400 font-medium">
                      <Lock className="h-3.5 w-3.5" /> {t("topics.list.requires", { levels: topic.targetLevels })}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={(e) => openApplyModal(topic.id, e)}
                      isLoading={isApplying}
                      disabled={isApplied || isApplying || !eligible}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      {t("common.apply")}
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedTopic && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSelectedTopic(null)}>
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 dark:border-slate-800 flex items-start justify-between gap-4 bg-gray-50/50 dark:bg-slate-800/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] font-bold uppercase rounded-full">
                    {selectedTopic.type === "COMPANY_PROPOSED" ? t("topics.list.company") : t("topics.list.professor")}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    selectedTopic.internshipType === "PFE" ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                  }`}>
                    {selectedTopic.internshipType}
                  </span>
                  {selectedTopic.filiere && (
                    <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800/50">
                      {selectedTopic.filiere.name}
                    </span>
                  )}
                  {levelBadge(selectedTopic.targetLevels)}
                </div>
                <h2 className="text-[18px] font-bold text-gray-900 dark:text-white leading-snug">{selectedTopic.title}</h2>
              </div>
              <button onClick={() => setSelectedTopic(null)} className="mt-1 h-8 w-8 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{t("topics.list.description")}</h3>
                <p className="text-[14px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedTopic.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">{t("topics.list.proposedBy")}</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{selectedTopic.proposedBy.name}</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">{t("topics.list.capacity")}</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{selectedTopic.maxStudents} {selectedTopic.maxStudents !== 1 ? t("topics.list.students") : t("topics.list.student")}</p>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">{t("topics.list.academicYear")}</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                    <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{selectedTopic.academicYear}</p>
                  </div>
                </div>
                {selectedTopic.assignedTeacher && (
                  <div className="bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl p-3.5">
                    <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1.5">{t("topics.list.supervisor")}</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />
                      <p className="text-[13px] font-medium text-gray-800 dark:text-gray-200">{selectedTopic.assignedTeacher.name}</p>
                    </div>
                  </div>
                )}
              </div>
              {skills(selectedTopic).length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> {t("topics.skills")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills(selectedTopic).map((s) => (
                      <span key={s} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[12px] font-medium rounded-lg border border-indigo-100 dark:border-indigo-800/50">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50/30 dark:bg-slate-800/30 flex justify-end">
              {applied.has(selectedTopic.id) ? (
                (() => {
                  const status = getApplicationStatus(selectedTopic);
                  return status ? (
                    <div className={`flex items-center justify-center gap-2 px-6 h-11 ${status.color} rounded-xl font-semibold text-[13px] border`}>
                      {status.icon} {status.text}
                    </div>
                  ) : null;
                })()
              ) : !canApply(studentLevel, selectedTopic.targetLevels) ? (
                <Button variant="outline" className="h-11 px-6 rounded-xl" onClick={() => setSelectedTopic(null)}>{t("common.close")}</Button>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" className="h-11 px-6 rounded-xl" onClick={() => setSelectedTopic(null)}>{t("common.close")}</Button>
                  <Button
                    className="min-w-[160px] h-11 text-[14px] rounded-xl shadow-lg shadow-indigo-100"
                    onClick={(e: React.MouseEvent) => openApplyModal(selectedTopic.id, e)}
                    disabled={applying === selectedTopic.id}
                  >
                    {applying === selectedTopic.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t("common.loading")}</> : t("common.apply")}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Already Applied Error Modal */}
      <Modal
        isOpen={alreadyModal.show}
        onClose={() => setAlreadyModal({ show: false, message: "" })}
        title={t("topics.cannotApplyTitle")}
        size="sm"
      >
        <div className="space-y-4 py-2">
          <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800/30">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <p className="text-[13px] text-red-800 dark:text-red-300 leading-relaxed">
              {alreadyModal.message}
            </p>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => setAlreadyModal({ show: false, message: "" })}>
              {t("common.close")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Apply Modal */}
      <Modal
        isOpen={applyModal.show}
        onClose={() => setApplyModal({ show: false, topicId: null, letter: "" })}
        title="Application Details"
        size="md"
      >
        <div className="space-y-4 py-2">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30 p-3 rounded text-[13px] text-indigo-800 dark:text-indigo-300">
            You are applying for this topic on behalf of your team. You can optionally include a motivation letter.
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Motivation Letter (Optional)
            </label>
            <textarea
              className="admin-input h-32 pt-3 resize-none w-full"
              placeholder="Write your motivation letter here... Tell the supervisor or company why your team is the best fit for this topic."
              value={applyModal.letter}
              onChange={(e) => setApplyModal({ ...applyModal, letter: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <Button variant="outline" onClick={() => setApplyModal({ show: false, topicId: null, letter: "" })}>
              Cancel
            </Button>
            <Button 
              onClick={handleApply} 
              isLoading={applying === applyModal.topicId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              Submit Application
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
