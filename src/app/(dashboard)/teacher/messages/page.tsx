"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ChatWindow } from "@/components/messages/ChatWindow";
import { InternshipThread, Message } from "@/types/message";
import { FileText, ChevronRight, ChevronLeft, Paperclip, Search, X, Users } from "lucide-react";
import { format } from "date-fns";

interface SharedFile {
  id: string;
  name: string;
  url: string;
  sentAt: string;
  senderName: string;
  category: "DOCUMENT" | "ATTACHMENT";
}

function TeacherMessagesContent() {
  const { data: session } = useSession();
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState<InternshipThread[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showFiles, setShowFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [sidebarTab, setSidebarTab] = useState<"files" | "participants">("files");

  // Fetch teacher's internships (as thread list)
  const loadInternships = useCallback(async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      const active = (data.data || []).filter(
        (i: any) => i.status !== "CANCELLED"
      );
      setInternships(active);
      if (active.length > 0 && !selectedId) {
        // Honour ?internshipId= from the detail page's "Open messages" link.
        const wanted =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("internshipId")
            : null;
        const match = wanted && active.some((i: any) => i.id === wanted);
        setSelectedId(match ? (wanted as string) : active[0].id);
      }
    } catch {
      toast.error(t("toast.loadInternshipsFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t, selectedId]);

  const fetchSharedFiles = useCallback(async (internshipId: string) => {
    try {
      // 1. Fetch messages to get attachments
      const msgRes = await fetch(`/api/messages/${internshipId}`);
      const msgData = await msgRes.json();
      const msgs = msgData.data || [];

      const msgAttachments: SharedFile[] = msgs
        .filter((m: any) => m.attachmentName && m.attachmentUrl)
        .map((m: any) => ({
          id: m.id,
          name: m.attachmentName!,
          url: m.attachmentUrl!,
          sentAt: m.sentAt,
          senderName: m.sender.name,
          category: "ATTACHMENT",
        }));

      // 2. Fetch formal documents
      const docRes = await fetch(`/api/documents?internshipId=${internshipId}`);
      const docData = await docRes.json();
      const docs: SharedFile[] = (docData.data || []).map((d: any) => ({
        id: d.id,
        name: d.fileName,
        url: d.fileUrl,
        sentAt: d.uploadedAt || d.createdAt,
        senderName: d.uploadedBy?.name || "System",
        category: "DOCUMENT",
      }));

      const combined = [...docs, ...msgAttachments].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      setSharedFiles(combined);
    } catch (error) {
      console.error("Failed to fetch shared files");
    }
  }, []);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  useEffect(() => {
    if (selectedId) {
      fetchSharedFiles(selectedId);
      const interval = setInterval(() => fetchSharedFiles(selectedId), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedId, fetchSharedFiles]);

  const selectedInternship = internships.find((i) => i.id === selectedId);

  const toggleSidebar = (tab: "files" | "participants") => {
    if (showFiles && sidebarTab === tab) {
      setShowFiles(false);
    } else {
      setSidebarTab(tab);
      setShowFiles(true);
    }
  };

  return (
    <div className="-mt-4 md:-mt-6 h-[calc(100vh-115px)] flex flex-col space-y-3 overflow-hidden">
      <div className="flex-shrink-0">
        <h1 className="text-[17px] font-bold text-gray-900 dark:text-white leading-none">Coordination Center</h1>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-1">
          Secure communication between student, supervisor, and company.
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden relative">
        {/* Team Selector Sidebar */}
        <div className={`w-64 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm flex flex-col overflow-hidden flex-shrink-0 transition-all
          ${selectedId ? "hidden md:flex" : "flex w-full md:w-64"}
        `}>
          <div className="px-4 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              My Teams
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map(n => (
                  <div key={n} className="h-12 bg-gray-50 dark:bg-slate-800 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : internships.length === 0 ? (
              <p className="p-6 text-center text-[12px] text-gray-400 dark:text-gray-500 italic">No teams assigned</p>
            ) : (
              internships.map((i) => (
                <button
                  key={i.id}
                  onClick={() => setSelectedId(i.id)}
                  className={`w-full text-left px-4 py-4 border-b border-gray-50 dark:border-slate-800/50 transition-all group relative ${selectedId === i.id ? "bg-indigo-50/50 dark:bg-indigo-900/20" : "hover:bg-gray-50 dark:hover:bg-slate-800/50"
                    }`}
                >
                  {selectedId === i.id && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600" />
                  )}
                  <p className={`text-[13px] font-bold truncate ${selectedId === i.id ? "text-indigo-700 dark:text-indigo-400" : "text-gray-800 dark:text-gray-200"}`}>
                    {i.topic.title}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 truncate">
                    {i.students.map((s) => s.student.name).join(", ")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat & Sidebar Area */}
        <div className={`flex-1 min-w-0 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col
          ${!selectedId ? "hidden md:flex" : "flex"}
        `}>
          {selectedId && session?.user?.id ? (
            <div className="flex-1 flex flex-col overflow-hidden relative">
              {/* Coordination Header */}
              <div className="px-4 md:px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 flex flex-col gap-6">
                <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                  <div className={`flex items-center gap-2 md:gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <button onClick={() => setSelectedId(null)} className="md:hidden p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg text-gray-500">
                      <ChevronLeft className={`h-5 w-5 ${isRTL ? "rotate-180" : ""}`} />
                    </button>
                    <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse hidden sm:block" />
                    <span className={`font-bold text-gray-800 dark:text-white uppercase tracking-tight truncate max-w-[150px] sm:max-w-none ${isRTL ? "text-[15px] leading-relaxed" : "text-[13px] leading-none"}`}>
                      {selectedInternship?.topic.title}
                    </span>
                  </div>
                  <div className={`flex items-center gap-1.5 md:gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <button
                      onClick={() => toggleSidebar("files")}
                      className={`h-8 px-2 md:px-3 rounded-md transition-all flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold border ${
                        showFiles && sidebarTab === "files" 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                          : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{sharedFiles.length} {t("messages.files")}</span>
                      <span className="xs:hidden">{sharedFiles.length}</span>
                    </button>
                    <button
                      onClick={() => toggleSidebar("participants")}
                      className={`h-8 px-2 md:px-3 rounded-md transition-all flex items-center gap-1.5 md:gap-2 text-[10px] md:text-[11px] font-bold border ${
                        showFiles && sidebarTab === "participants" 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                          : "bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 border-gray-200 dark:border-slate-700"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{t("messages.participants")} ({(selectedInternship?.students.length || 0) + 1 + (selectedInternship?.topic.type === "COMPANY_PROPOSED" ? 1 : 0)})</span>
                      <span className="xs:hidden">{(selectedInternship?.students.length || 0) + 1 + (selectedInternship?.topic.type === "COMPANY_PROPOSED" ? 1 : 0)}</span>
                    </button>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400`} />
                  <input
                    type="text"
                    placeholder={t("common.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full h-8 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-full ${isRTL ? "pr-8 pl-4 text-right" : "pl-8 pr-4"} text-[12px] text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300`}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 overflow-hidden">
                  <ChatWindow
                    internshipId={selectedId}
                    currentUserId={session.user.id}
                    isAdmin={session.user.role === "ADMIN"}
                    searchQuery={searchQuery}
                  />
                </div>

                {/* Coordination Details Sidebar (Toggleable & Mobile Overlay) */}
                {showFiles && (
                  <div className={`absolute inset-0 md:relative md:inset-auto md:w-80 z-20 border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col animate-in ${isRTL ? "border-r slide-in-from-left" : "border-l slide-in-from-right"} duration-300 shadow-xl md:shadow-none`}>
                    <div className={`p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                      <h3 className="text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-widest">
                        {sidebarTab === "files" ? t("messages.files") : t("messages.participants")}
                      </h3>
                      <button onClick={() => setShowFiles(false)} className="md:hidden p-1 hover:bg-gray-200 rounded-lg text-gray-400">
                        <X className="h-4 w-4" />
                      </button>
                      <div className="hidden md:block">
                        {sidebarTab === "files" ? <FileText className="h-4 w-4 text-gray-400" /> : <Users className="h-4 w-4 text-gray-400" />}
                      </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-3">
                      {sidebarTab === "participants" ? (
                        <div className="space-y-6">
                          {/* Supervisor */}
                          <div className="space-y-2">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter px-1">{t("messages.supervisor")}</p>
                            <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-2.5 shadow-sm">
                              <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                                <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                                  {selectedInternship?.teacher?.name.charAt(0) || "S"}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">{selectedInternship?.teacher?.name || "No Supervisor"}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{selectedInternship?.teacher?.email || "N/A"}</p>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Hosting Company — only for company-proposed topics */}
                          {selectedInternship?.topic.type === "COMPANY_PROPOSED" && (
                            <div className="space-y-2">
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter px-1">{t("company.msg.hostingCompany")}</p>
                              <div className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-2.5 shadow-sm">
                                <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                                  <div className="h-8 w-8 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                                    {selectedInternship?.topic.companyName?.charAt(0) || "C"}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">{selectedInternship?.topic.companyName || "Company"}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{t("company.msg.hostingPartner")}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Students */}
                          <div className="space-y-2">
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-tighter px-1">{t("messages.students")}</p>
                            <div className="space-y-2">
                              {selectedInternship?.students.map((s, idx) => (
                                <div key={`${s.student.email}-${idx}`} className="rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800 p-2.5 shadow-sm">
                                  <div className={`flex items-center gap-4 ${isRTL ? "flex-row-reverse text-right" : ""}`}>
                                    <div className="h-8 w-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-[12px] flex-shrink-0">
                                      {s.student.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[12px] font-bold text-gray-900 dark:text-white truncate">{s.student.name}</p>
                                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{s.student.email}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {sharedFiles.length === 0 ? (
                            <div className="text-center py-12">
                              <FileText className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                              <p className="text-[12px] text-gray-400">No shared files yet.</p>
                            </div>
                          ) : (
                            sharedFiles.map((file) => (
                              <a
                                key={file.id}
                                href={file.url}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 border border-transparent hover:border-gray-100 dark:hover:border-slate-700 transition-all group ${isRTL ? "flex-row-reverse" : ""}`}
                              >
                                <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  file.category === "DOCUMENT" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                                }`}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className={`min-w-0 flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                                  <p className="text-[12px] font-semibold text-gray-800 dark:text-gray-200 truncate group-hover:text-indigo-700 dark:group-hover:text-indigo-400 transition-colors" title={file.name}>
                                    {file.name}
                                  </p>
                                  <p className="text-[10px] text-gray-400 mt-0.5">
                                    {format(new Date(file.sentAt), "d MMM, yyyy")}
                                  </p>
                                </div>
                              </a>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-gray-400 dark:text-gray-500 text-[13px]">Select a team to start communicating.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherMessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading Hub…</div>}>
      <TeacherMessagesContent />
    </Suspense>
  );
}
