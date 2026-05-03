"use client";

import React, { useEffect, useState, useRef } from "react";
import { Send, Paperclip, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

interface Message {
  id: string;
  content: string;
  sender: { name: string };
  senderId: string;
  sentAt: string;
  attachmentName?: string | null;
  attachmentUrl?: string | null;
}

interface Internship {
  id: string;
  topic: { title: string };
  students: { student: { name: string } }[];
  teacher: { name: string };
}

export default function CompanyMessagesPage() {
  const { data: session } = useSession();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/internships");
        const data = await res.json();
        const active = (data.data || []).filter(
          (i: any) => !["CANCELLED", "REQUESTED"].includes(i.status)
        );
        setInternships(active);
        if (active.length > 0) setSelectedId(active[0].id);
      } catch {
        toast.error("Failed to load internships");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const fetchMessages = async (id: string) => {
    try {
      const res = await fetch(`/api/messages/${id}`);
      const data = await res.json();
      setMessages(data.data || []);
    } catch {
      toast.error("Failed to load messages");
    }
  };

  useEffect(() => { if (selectedId) fetchMessages(selectedId); }, [selectedId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    if (!selectedId) return;
    const interval = setInterval(() => fetchMessages(selectedId), 15000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedId) return;
    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId: selectedId, content: newMessage.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setMessages((prev) => [...prev, data.data]);
      setNewMessage("");
    } catch {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const selected = internships.find((i) => i.id === selectedId);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900">Intern Communications</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Coordinate directly with your interns and their university supervisor.
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {internships.length > 1 && (
          <div className="w-56 bg-white border border-gray-200 rounded-md shadow-sm flex flex-col overflow-y-auto flex-shrink-0">
            <p className="px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b">Threads</p>
            {internships.map((i) => (
              <button key={i.id} onClick={() => setSelectedId(i.id)}
                className={`text-left px-4 py-3 text-[12px] border-b border-gray-100 hover:bg-indigo-50 transition-colors ${
                  selectedId === i.id ? "bg-indigo-50 text-indigo-700 font-semibold" : "text-gray-700"
                }`}>
                {i.topic.title}
                <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                  {i.students.map((s) => s.student.name).join(", ")}
                </p>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden flex flex-col">
          <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">
                {selected ? selected.topic.title : "No active internship"}
              </span>
            </div>
            {selected && (
              <span className="text-[11px] text-gray-400">
                Supervisor: {selected.teacher.name}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <p className="text-center text-gray-400 text-[13px]">Loading…</p>
            ) : !selectedId ? (
              <p className="text-center text-gray-400 text-[13px] py-12">No active internships found.</p>
            ) : messages.length === 0 ? (
              <p className="text-center text-gray-400 text-[13px] py-12">No messages yet.</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === session?.user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[70%]">
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                        <span className="text-[11px] font-bold text-gray-900">
                          {isMe ? "You" : msg.sender.name}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {format(new Date(msg.sentAt), "HH:mm")}
                        </span>
                      </div>
                      <div className={`p-4 rounded-2xl text-[14px] leading-relaxed ${
                        isMe ? "bg-indigo-600 text-white rounded-tr-none" : "bg-gray-100 text-gray-800 rounded-tl-none"
                      }`}>
                        {msg.content}
                        {msg.attachmentName && (
                          <a href={msg.attachmentUrl ?? "#"} target="_blank" rel="noreferrer"
                            className={`mt-3 p-2 rounded-lg flex items-center gap-3 border ${
                              isMe ? "bg-indigo-700 border-indigo-500" : "bg-white border-gray-200"
                            }`}>
                            <FileText className="h-4 w-4 flex-shrink-0" />
                            <span className="text-[11px] font-medium truncate">{msg.attachmentName}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-gray-100 bg-gray-50/30">
            <div className="max-w-4xl mx-auto flex items-center gap-2">
              <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                <Paperclip className="h-5 w-5" />
              </button>
              <input type="text" placeholder={selectedId ? "Type your message..." : "No active internship"}
                disabled={!selectedId || isSending}
                className="flex-1 h-11 bg-white border border-gray-200 rounded-full px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-50"
                value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
              <button type="submit" disabled={!selectedId || isSending || !newMessage.trim()}
                className="h-11 w-11 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
