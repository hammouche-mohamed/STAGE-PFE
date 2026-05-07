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
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("ALL");
  const [applying, setApplying] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [alreadyModal, setAlreadyModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [filiereFilter, setFiliereFilter] = useState<string>("ALL");

  const studentLevel = (session?.user as any)?.level as string | undefined;

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch("/api/topics").then(r => r.json()),
      fetch("/api/filieres").then(r => r.json())
    ]).then(([topicsData, filieresData]) => {
      setTopics(topicsData.data || []);
      setFilieres(filieresData.data || []);
    })
    .catch(() => toast.error(t("toast.loadTopicsFailed")))
    .finally(() => setIsLoading(false));
  }, []);

  const handleApply = async (topicId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setApplying(topicId);
    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json();
      if (res.status === 409 && data.error === "ALREADY_IN_INTERNSHIP") {
        setAlreadyModal({ show: true, message: data.message });
        return;
      }
      if (!res.ok) { toast.error(data.error || "Failed to apply"); return; }
      setApplied((prev) => new Set(prev).add(topicId));
      setSelectedTopic(null);
      toast.success(t("toast.applicationSubmitted"));
    } catch {
      toast.error(t("toast.networkError"));
    } finally {
      setApplying(null);
    }
  };

  const filteredTopics = React.useMemo(() => {
    return topics.filter((topic) => {
      const matchesSearch =
        topic.title.toLowerCase().includes(search.toLowerCase()) ||
        topic.proposedBy.name.toLowerCase().includes(search.toLowerCase()) ||
        topic.description?.toLowerCase().includes(search.toLowerCase());

      const matchesLevel =
        levelFilter === "ALL" ||
        !topic.targetLevels ||
        topic.targetLevels.split(",").map((l) => l.trim()).includes(levelFilter);

      const matchesFiliere = filiereFilter === "ALL" || topic.filiereId === filiereFilter;

      return matchesSearch && matchesLevel && matchesFiliere;
    });
  }, [topics, search, levelFilter, filiereFilter]);

  const skills = (t: Topic) =>
    t.requiredSkills ? t.requiredSkills.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];

  const levelBadge = (targetLevels?: string | null) => {
    if (!targetLevels) return null;
    const levels = targetLevels.split(",").map((l) => l.trim());
    return (
      <div className="flex flex-wrap gap-1">
        {levels.map((l) => (
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
          <h1 className="text-[17px] font-semibold text-gray-900">{t("topics.title")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("topics.pendingApproval")}</p>
        </div>
        <Link href="/student/topics/propose">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-4 w-4 mr-2" />
            {t("topics.propose")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("common.search")}
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="admin-input md:w-64"
          value={filiereFilter}
          onChange={(e) => setFiliereFilter(e.target.value)}
        >
          <option value="ALL">All Departments (Filières)</option>
          {filieres.map(f => (
            <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
          <GraduationCap className="h-3.5 w-3.5" /> Level:
        </span>
        {["ALL", ...LEVELS].map((level) => (
          <button
            key={level}
            onClick={() => setLevelFilter(level)}
            className={`px-3 py-1 text-[12px] font-semibold rounded-full border transition-all ${
              levelFilter === level
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300"
            }`}
          >
            {level}
          </button>
        ))}
        {studentLevel && (
          <span className="ml-auto text-[11px] text-gray-400">
            Your level: <span className="font-bold text-indigo-600">{studentLevel}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-400">{t("common.loading")}</div>
        ) : filteredTopics.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">{t("topics.noTopics")}</div>
        ) : (
          filteredTopics.map((topic) => {
            const isApplied = applied.has(topic.id);
            const isApplying = applying === topic.id;
            const eligible = canApply(studentLevel, topic.targetLevels);
            const topicSkills = skills(topic);
            return (
              <div
                key={topic.id}
                onClick={() => setSelectedTopic(topic)}
                className="bg-white border border-gray-200 rounded-xl p-6 flex flex-col justify-between hover:border-indigo-300 hover:shadow-md transition-all group cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-full">
                        {topic.type === "COMPANY_PROPOSED" ? "Company" : "Professor"}
                      </span>
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                        topic.internshipType === "PFE" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                      }`}>
                        {topic.internshipType}
                      </span>
                      {topic.filiere && (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                          {topic.filiere.code || topic.filiere.name}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                  </div>

                  {topic.targetLevels && (
                    <div className="flex items-center gap-1.5">
                      {levelBadge(topic.targetLevels)}
                      {!eligible && (
                        <span className="text-[10px] text-amber-600 flex items-center gap-0.5">
                          <Lock className="h-3 w-3" /> {studentLevel} not eligible
                        </span>
                      )}
                    </div>
                  )}

                  <h3 className="text-[14px] font-bold text-gray-900 group-hover:text-indigo-700 transition-colors leading-snug">
                    {topic.title}
                  </h3>
                  <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed">{topic.description}</p>

                  {topicSkills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {topicSkills.slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded">{s}</span>
                      ))}
                      {topicSkills.length > 3 && (
                        <span className="px-1.5 py-0.5 text-gray-400 text-[10px]">+{topicSkills.length - 3} more</span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[12px] text-gray-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-gray-400" />
                      {topic.proposedBy.name}
                    </div>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Users className="h-3.5 w-3.5" />
                      {topic.maxStudents} student{topic.maxStudents !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                  {isApplied ? (
                    <span className="flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                      <CheckCircle2 className="h-4 w-4" /> {t("status.APPROVED")}
                    </span>
                  ) : !eligible ? (
                    <span className="flex items-center gap-1.5 text-[12px] text-amber-600 font-medium">
                      <Lock className="h-3.5 w-3.5" /> Not eligible (requires {topic.targetLevels})
                    </span>
                  ) : (
                    <Button onClick={(e) => handleApply(topic.id, e)} size="sm" className="px-6" disabled={isApplying}>
                      {isApplying ? <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{t("common.loading")}</> : t("common.apply")}
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
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex items-start justify-between gap-4 bg-gray-50/50">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded-full">
                    {selectedTopic.type === "COMPANY_PROPOSED" ? "Company" : "Professor"}
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                    selectedTopic.internshipType === "PFE" ? "bg-purple-50 text-purple-700" : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {selectedTopic.internshipType}
                  </span>
                  {selectedTopic.filiere && (
                    <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-full border border-amber-200">
                      {selectedTopic.filiere.name}
                    </span>
                  )}
                  {levelBadge(selectedTopic.targetLevels)}
                </div>
                <h2 className="text-[18px] font-bold text-gray-900 leading-snug">{selectedTopic.title}</h2>
              </div>
              <button onClick={() => setSelectedTopic(null)} className="mt-1 h-8 w-8 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              <div>
                <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Description</h3>
                <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-wrap">{selectedTopic.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Proposed By</p>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-indigo-500" />
                    <p className="text-[13px] font-medium text-gray-800">{selectedTopic.proposedBy.name}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Capacity</p>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <p className="text-[13px] font-medium text-gray-800">{selectedTopic.maxStudents} student{selectedTopic.maxStudents !== 1 ? "s" : ""}</p>
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Academic Year</p>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <p className="text-[13px] font-medium text-gray-800">{selectedTopic.academicYear}</p>
                  </div>
                </div>
                {selectedTopic.assignedTeacher && (
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Supervisor</p>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-indigo-500" />
                      <p className="text-[13px] font-medium text-gray-800">{selectedTopic.assignedTeacher.name}</p>
                    </div>
                  </div>
                )}
              </div>
              {skills(selectedTopic).length > 0 && (
                <div>
                  <h3 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5" /> {t("topics.skills")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills(selectedTopic).map((s) => (
                      <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-[12px] font-medium rounded-lg border border-indigo-100">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {selectedTopic && !canApply(studentLevel, selectedTopic.targetLevels) && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[12px]">
                  <Lock className="h-4 w-4 flex-shrink-0" />
                  This topic is restricted to level(s): <strong>{selectedTopic.targetLevels}</strong>. Your level ({studentLevel}) is not eligible to apply.
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/30 flex justify-end">
              {applied.has(selectedTopic.id) ? (
                <div className="flex items-center justify-center gap-2 px-6 h-11 bg-emerald-50 text-emerald-700 rounded-xl font-semibold text-[13px] border border-emerald-100">
                  <CheckCircle2 className="h-4 w-4" /> Application Already Sent
                </div>
              ) : !canApply(studentLevel, selectedTopic.targetLevels) ? (
                <Button variant="outline" className="h-11 px-6 rounded-xl" onClick={() => setSelectedTopic(null)}>Close</Button>
              ) : (
                <div className="flex gap-3">
                  <Button variant="outline" className="h-11 px-6 rounded-xl" onClick={() => setSelectedTopic(null)}>{t("common.close")}</Button>
                  <Button
                    className="min-w-[160px] h-11 text-[14px] rounded-xl shadow-lg shadow-indigo-100"
                    onClick={(e) => handleApply(selectedTopic.id, e)}
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

      {alreadyModal.show && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center mb-4">
                <AlertCircle className="h-7 w-7 text-amber-500" />
              </div>
              <h3 className="text-[16px] font-bold text-gray-900">Already Enrolled</h3>
              <p className="text-[13px] text-gray-500 mt-2 leading-relaxed">{alreadyModal.message}</p>
            </div>
            <div className="px-6 pb-6">
              <button
                onClick={() => setAlreadyModal({ show: false, message: "" })}
                className="w-full h-11 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
