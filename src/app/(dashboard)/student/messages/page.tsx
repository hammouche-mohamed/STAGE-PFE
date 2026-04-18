"use client";

import React, { useEffect, useState } from "react";
import { 
  Send, 
  Paperclip, 
  MessageSquare, 
  Search, 
  User, 
  Clock, 
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronLeft
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

interface Message {
  id: string;
  content: string;
  sender: { name: string };
  senderId: string;
  createdAt: string;
  attachmentName?: string;
  requiresAction?: boolean;
}

function MessagesContent() {
  const searchParams = useSearchParams();
  const backUrl = searchParams.get("back") || "/student/internship";
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Hardcoded for simulation - in real app, we fetch from session's internship
  const fetchMessages = async () => {
    try {
      // Mocking messages for now since we need an internshipId
      setMessages([
        {
          id: "1",
          content: "Hello team, I've uploaded the draft of the context analysis. Please review.",
          sender: { name: "Anis Rahmani" },
          senderId: "student-1",
          createdAt: new Date(2024, 3, 10, 14, 30).toISOString(),
          attachmentName: "context_analysis_v1.pdf"
        },
        {
          id: "2",
          content: "Thanks Anis. I will check it by tomorrow morning.",
          sender: { name: "M. Amine" },
          senderId: "teacher-1",
          createdAt: new Date(2024, 3, 10, 16, 45).toISOString()
        }
      ]);
    } catch (error) {
      toast.error("Failed to load conversation");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const msg: Message = {
      id: Date.now().toString(),
      content: newMessage,
      sender: { name: "Me" },
      senderId: "current-user",
      createdAt: new Date().toISOString()
    };

    setMessages([...messages, msg]);
    setNewMessage("");
    toast.success("Message sent");
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4">
      <div className="flex flex-col space-y-4">
        <Link 
          href={backUrl} 
          className="flex items-center text-[12px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors w-fit bg-indigo-50 px-3 py-1 rounded-full"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Internship
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900">Coordination Center</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Secure communication between student, supervisor, and company.</p>
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden flex flex-col">
        {/* Chat Header */}
        <div className="h-14 px-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
           <div className="flex items-center gap-3">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-[13px] font-bold text-gray-700 uppercase tracking-tight">Active Track: Telemedicine Platform</span>
           </div>
           <div className="flex items-center gap-4">
              <span className="text-[11px] text-gray-400 font-medium">3 Participants</span>
           </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {messages.map((msg) => {
             const isMe = msg.senderId === "current-user" || msg.senderId === "student-1";
             return (
               <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                 <div className={`max-w-[70%] space-y-1 ${isMe ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
                       <span className="text-[11px] font-bold text-gray-900">{msg.sender.name}</span>
                       <span className="text-[10px] text-gray-400 font-medium">{format(new Date(msg.createdAt), "HH:mm")}</span>
                    </div>
                    <div className={`p-4 rounded-2xl text-[14px] leading-relaxed relative ${
                      isMe 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-gray-100 text-gray-800 rounded-tl-none"
                    }`}>
                       {msg.content}
                       {msg.attachmentName && (
                         <div className={`mt-3 p-2 rounded-lg flex items-center gap-3 border ${
                           isMe ? "bg-indigo-700 border-indigo-500" : "bg-white border-gray-200"
                         }`}>
                            <FileText className="h-4 w-4" />
                            <span className="text-[11px] font-medium truncate">{msg.attachmentName}</span>
                         </div>
                       )}
                    </div>
                 </div>
               </div>
             );
           })}
        </div>

        {/* Input area */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-100 bg-gray-50/30">
           <div className="max-w-4xl mx-auto flex items-center gap-2">
              <button type="button" className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                 <Paperclip className="h-5 w-5" />
              </button>
              <input 
                type="text" 
                placeholder="Type your message here..."
                className="flex-1 h-11 bg-white border border-gray-200 rounded-full px-5 text-[14px] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
              />
              <button 
                type="submit"
                className="h-11 w-11 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
              >
                 <Send className="h-4 w-4" />
              </button>
           </div>
        </form>
      </div>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading conversation...</div>}>
      <MessagesContent />
    </Suspense>
  );
}
