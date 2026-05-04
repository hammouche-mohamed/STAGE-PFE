"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { Send, Paperclip, FileText, ChevronLeft, Trash2, CornerUpLeft, X, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Message {
  id: string;
  content: string;
  sender: { name: string };
  senderId: string;
  sentAt: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

interface SharedFile {
  id: string;
  name: string;
  url: string;
  sentAt: string;
  senderName: string;
  category: "DOCUMENT" | "ATTACHMENT";
}

interface Internship {
  id: string;
  topic: { title: string };
  teacher: { name: string };
  students: { student: { name: string }; isLeader: boolean }[];
  status: string;
}

function MessagesContent() {
  const { data: session } = useSession();
  const { t, isRTL } = useTranslation();
  const searchParams = useSearchParams();
  const backUrl = searchParams.get("back") || "/student/internship";

  const [internship, setInternship] = useState<Internship | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  // Modals
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFiles, setShowFiles] = useState(false);
  const [sharedFiles, setSharedFiles] = useState<SharedFile[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async (internshipId: string) => {
    try {
      const res = await fetch(`/api/messages/${internshipId}`);
      if (!res.ok) return;
      const data = await res.json();
      const msgs = data.data || [];
      setMessages(msgs);

      // Aggregate shared files
      const msgAttachments: SharedFile[] = msgs
        .filter((m: Message) => m.attachmentName && m.attachmentUrl)
        .map((m: Message) => ({
          id: m.id,
          name: m.attachmentName!,
          url: m.attachmentUrl!,
          sentAt: m.sentAt,
          senderName: m.sender.name,
          category: "ATTACHMENT",
        }));

      // Fetch formal documents
      const docRes = await fetch(`/api/documents?internshipId=${internshipId}`);
      const docData = await docRes.json();
      const docs: SharedFile[] = (docData.data || []).map((d: any) => ({
        id: d.id,
        name: d.fileName,
        url: d.fileUrl,
        sentAt: d.uploadedAt,
        senderName: d.uploadedBy.name,
        category: "DOCUMENT",
      }));

      const combined = [...docs, ...msgAttachments].sort(
        (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
      );
      setSharedFiles(combined);
    } catch {
      /* silent */
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/internships");
        if (!res.ok) throw new Error();
        const data = await res.json();
        const active = (data.data as Internship[] || []).find(
          (i) => !["CANCELLED"].includes(i.status)
        );
        if (active) {
          setInternship(active);
          await fetchMessages(active.id);
        }
      } catch {
        toast.error(t("toast.loadInternshipFailed"));
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  useEffect(() => {
    if (!internship) return;
    const id = setInterval(() => fetchMessages(internship.id), 5000); // NFR-P3: ≤5s polling
    return () => clearInterval(id);
  }, [internship]);

  // Focus input when replying
  useEffect(() => { if (replyTo) inputRef.current?.focus(); }, [replyTo]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !internship) return;
    setIsSending(true);

    const content = replyTo
      ? `↩ ${replyTo.sender.name}: "${replyTo.content.slice(0, 60)}${replyTo.content.length > 60 ? "…" : ""}"\n\n${newMessage.trim()}`
      : newMessage.trim();

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId: internship.id, content }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, data.data]);
      setNewMessage("");
      setReplyTo(null);
    } catch {
      toast.error(t("toast.messageSendFailed"));
    } finally {
      setIsSending(false);
    }
  };

  // Step 1: user picks a file → store it, show confirm modal
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_MB = 10;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`File too large (max ${MAX_MB}MB)`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setPendingFile(file); // show confirm modal
  };

  // Step 2: user confirms → upload and send
  const confirmSendFile = async () => {
    if (!pendingFile || !internship) return;
    setUploadingFile(true);
    setPendingFile(null);
    try {
      const form = new FormData();
      form.append("file", pendingFile);
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error();
      const { url, name } = await uploadRes.json();

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipId: internship.id,
          content: newMessage.trim() || `📎 Sent a file: ${name}`,
          attachmentUrl: url,
          attachmentName: name,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, data.data]);
      setNewMessage("");
      setReplyTo(null);
      toast.success(t("toast.fileSent"));
    } catch {
      toast.error(t("toast.fileSendFailed"));
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast.success(t("toast.messageDeleted"));
    } catch {
      toast.error(t("toast.messageDeleteFailed"));
    }
  };

  const isReplyContent = (content: string) => content.startsWith("↩ ");
  const parseReply = (content: string) => {
    if (!isReplyContent(content)) return { quoted: null, text: content };
    const nlIdx = content.indexOf("\n\n");
    if (nlIdx === -1) return { quoted: null, text: content };
    return { quoted: content.slice(0, nlIdx), text: content.slice(nlIdx + 2) };
  };

  const participants = internship
    ? [...(internship.students?.map((s) => s.student.name) ?? []), internship.teacher?.name].filter(Boolean)
    : [];

  const fmtBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`;
  const fileIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["png","jpg","jpeg"].includes(ext ?? "")) return "🖼";
    if (ext === "pdf") return "📄";
    if (["doc","docx"].includes(ext ?? "")) return "📝";
    if (ext === "zip") return "🗜";
    return "📎";
  };

  const displayMessages = searchQuery.trim()
    ? messages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.attachmentName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      <div className="flex flex-col space-y-2">
        <Link href={backUrl}
          className="flex items-center text-[12px] text-indigo-600 hover:text-indigo-800 font-medium w-fit bg-indigo-50 px-3 py-1 rounded-full">
          <ChevronLeft className="h-4 w-4 mr-1" />Back to Internship
        </Link>
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">{t("messages.title")}</h1>
          <p className="text-[13px] text-gray-500">{t("messages.subtitle")}</p>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/60 flex flex-col gap-2">
          <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <div className={`h-2.5 w-2.5 rounded-full ${internship ? "bg-green-500" : "bg-gray-300"}`} />
              <span className="text-[13px] font-bold text-gray-800 uppercase tracking-tight">
                {internship ? internship.topic.title : "No active internship"}
              </span>
            </div>
            <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button 
                onClick={() => setShowFiles(!showFiles)}
                className={`p-1.5 rounded-md transition-colors flex items-center gap-1.5 text-[11px] font-medium ${
                  showFiles ? "bg-indigo-600 text-white" : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                {showFiles ? "Hide Files" : "View Files"}
              </button>
              <span className="text-[11px] text-gray-400">{participants.length} Participants</span>
            </div>
          </div>
          {internship && (
            <div className="relative">
              <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400`} />
              <input
                type="text"
                placeholder={t("common.search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full h-8 bg-white border border-gray-200 rounded-full ${isRTL ? "pr-8 pl-4 text-right" : "pl-8 pr-4"} text-[12px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300`}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Messages Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-2 bg-gray-50/30">
              {isLoading ? (
                <p className="text-center text-gray-400 text-[13px] pt-12">Loading…</p>
              ) : !internship ? (
                <p className="text-center text-gray-400 text-[13px] pt-12">
                  No active internship. Messages appear once your internship starts.
                </p>
              ) : displayMessages.length === 0 ? (
                <p className="text-center text-gray-400 text-[13px] pt-12">
                  {searchQuery ? `No messages matching "${searchQuery}"` : "No messages yet — start the conversation!"}
                </p>
              ) : (
                displayMessages.map((msg) => {
                  const isMe = msg.senderId === session?.user?.id;
                  const { quoted, text } = parseReply(msg.content);

                  return (
                    <div
                      key={msg.id}
                      className={`flex group ${isMe ? "justify-end" : "justify-start"}`}
                      onMouseEnter={() => setHoveredId(msg.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      {/* Action buttons — left side for own, right side for others */}
                      {!isMe && hoveredId === msg.id && (
                        <div className="flex items-center gap-1 mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setReplyTo(msg)}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                            title="Reply">
                            <CornerUpLeft className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}

                      <div className={`max-w-[65%] space-y-0.5 ${isMe ? "items-end flex flex-col" : "items-start flex flex-col"}`}>
                        {/* Sender + time */}
                        <div className={`flex items-center gap-2 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="text-[11px] font-bold text-gray-700">
                            {isMe ? "You" : msg.sender.name}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {format(new Date(msg.sentAt), "HH:mm · d MMM")}
                          </span>
                        </div>

                        {/* Bubble */}
                        <div className={`relative px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed ${
                          isMe
                            ? "bg-indigo-600 text-white rounded-tr-sm"
                            : "bg-white text-gray-800 rounded-tl-sm shadow-sm border border-gray-100"
                        }`}>
                          {/* Quoted reply */}
                          {quoted && (
                            <div className={`mb-2 px-3 py-1.5 rounded-lg text-[11px] border-l-2 ${
                              isMe ? "bg-indigo-700 border-indigo-300 text-indigo-200" : "bg-gray-50 border-indigo-400 text-gray-500"
                            }`}>
                              {quoted}
                            </div>
                          )}
                          {text}

                          {/* Attachment */}
                          {msg.attachmentName && (
                            <a href={msg.attachmentUrl ?? "#"} target="_blank" rel="noreferrer"
                              className={`mt-2 p-2 rounded-lg flex items-center gap-2 border text-[11px] ${
                                isMe ? "bg-indigo-700 border-indigo-500 text-white" : "bg-gray-50 border-gray-200 text-gray-600"
                              }`}>
                              <FileText className="h-4 w-4 flex-shrink-0" />
                              <span className="truncate font-medium">{msg.attachmentName}</span>
                            </a>
                          )}
                        </div>
                      </div>

                      {/* Action buttons — right side for own messages */}
                      {isMe && hoveredId === msg.id && (
                        <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity self-end mb-1">
                          <button onClick={() => setReplyTo(msg)}
                            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                            title="Reply">
                            <CornerUpLeft className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setDeleteTarget(msg.id)}
                            className="p-1.5 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                            title="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Reply preview */}
            {replyTo && (
              <div className="mx-4 mb-0 px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-t-lg flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-indigo-700 mb-0.5">
                    ↩ Replying to {replyTo.senderId === session?.user?.id ? "yourself" : replyTo.sender.name}
                  </p>
                  <p className="text-[12px] text-gray-500 truncate">{replyTo.content.slice(0, 80)}</p>
                </div>
                <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Input */}
            <form onSubmit={handleSend} className={`p-4 border-t border-gray-100 bg-white ${replyTo ? "rounded-t-none" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.txt"
                onChange={handleFileSelect}
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!internship || uploadingFile}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40 flex-shrink-0"
                  title="Attach file">
                  {uploadingFile
                    ? <span className="h-5 w-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin block" />
                    : <Paperclip className="h-5 w-5" />}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder={internship ? t("messages.typeMessage") : "No active internship"}
                  disabled={!internship || isSending}
                  className={`flex-1 h-11 bg-gray-50 border border-gray-200 rounded-full px-5 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 focus:bg-white transition-all disabled:opacity-50 ${isRTL ? "text-right" : "text-left"}`}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!internship || isSending || !newMessage.trim()}
                  className={`h-11 w-11 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 disabled:opacity-40 flex-shrink-0 ${isRTL ? "rotate-180" : ""}`}>
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Shared Files Sidebar */}
          {showFiles && (
            <div className={`w-72 border-gray-100 bg-white flex flex-col animate-in ${isRTL ? "border-r slide-in-from-left" : "border-l slide-in-from-right"} duration-300`}>
              <div className={`p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
                <h3 className="text-[12px] font-bold text-gray-900 uppercase tracking-tight">{t("messages.sharedFiles")}</h3>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
                  {sharedFiles.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {sharedFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-8 w-8 text-gray-200 mx-auto mb-2" />
                    <p className="text-[11px] text-gray-400 px-4">{t("messages.noFiles")}</p>
                  </div>
                ) : (
                  sharedFiles.map((file) => (
                    <a
                      key={file.id}
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      className={`flex items-start gap-3 p-2.5 rounded-xl hover:bg-indigo-50/50 border border-transparent hover:border-indigo-100 transition-all group ${isRTL ? "flex-row-reverse" : ""}`}
                    >
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        file.category === "DOCUMENT" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
                      }`}>
                        {fileIcon(file.name) === "🖼" ? <span className="text-sm">🖼</span> : <FileText className="h-4 w-4" />}
                      </div>
                      <div className={`min-w-0 flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                        <p className="text-[12px] font-semibold text-gray-800 truncate group-hover:text-indigo-700 transition-colors" title={file.name}>
                          {file.name}
                        </p>
                        <div className={`flex items-center gap-1.5 mt-0.5 ${isRTL ? "flex-row-reverse" : ""}`}>
                          <span className={`text-[9px] font-bold px-1 rounded uppercase ${
                            file.category === "DOCUMENT" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                          }`}>
                            {file.category === "DOCUMENT" ? "Doc" : "Chat"}
                          </span>
                          <span className="text-[10px] text-gray-400 truncate">
                            {file.senderName} · {format(new Date(file.sentAt), "d MMM")}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── FILE CONFIRM MODAL ────────────────────────────────────────────── */}
      {pendingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <h3 className="text-[15px] font-semibold text-gray-900">Send this file?</h3>
              <p className="text-[12px] text-gray-400 mt-0.5">Review the file before sending it to the group.</p>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center gap-4 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <span className="text-3xl">{fileIcon(pendingFile.name)}</span>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-gray-800 truncate">{pendingFile.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{fmtBytes(pendingFile.size)}</p>
                </div>
              </div>
              {newMessage.trim() && (
                <div className="mt-3 px-3 py-2 bg-indigo-50 rounded-lg">
                  <p className="text-[11px] text-indigo-600 font-medium mb-0.5">With message:</p>
                  <p className="text-[12px] text-gray-700 line-clamp-2">{newMessage}</p>
                </div>
              )}
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => { setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={confirmSendFile}
                className="flex-1 h-10 rounded-xl bg-indigo-600 text-white text-[13px] font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
                <Send className="h-3.5 w-3.5" /> Send File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM MODAL ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs mx-4 overflow-hidden">
            <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900">Delete message?</h3>
              <p className="text-[12px] text-gray-400 mt-1">
                This message will be permanently removed from the conversation.
              </p>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-10 rounded-xl border border-gray-200 text-[13px] font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                Keep it
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 h-10 rounded-xl bg-red-500 text-white text-[13px] font-semibold hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <MessagesContent />
    </Suspense>
  );
}

