"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/Button";
import { Paperclip, Send, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Message {
  id: string;
  senderId: string;
  sender: { name: string };
  content: string;
  sentAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
  requiresAction?: boolean;
  actionStatus?: string;
}

interface ChatWindowProps {
  internshipId: string;
  currentUserId: string;
  isAdmin: boolean;
  searchQuery?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  internshipId, 
  currentUserId,
  isAdmin,
  searchQuery = ""
}) => {
  const { t, isRTL } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Filter messages based on search query
  const filteredMessages = messages.filter(msg => {
    const search = searchQuery.toLowerCase();
    const messageContent = (msg.content || "").toLowerCase();
    const senderName = (msg.sender?.name || "").toLowerCase();
    return messageContent.includes(search) || senderName.includes(search);
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages/${internshipId}`);
      const data = await res.json();
      if (data.data) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch messages");
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [internshipId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus();
    }
  }, [replyTo]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const messageText = content.trim();
    if (!messageText || isSending) return;

    setIsSending(true);
    const finalContent = replyTo
      ? `↩ ${replyTo.sender?.name || "User"}: "${replyTo.content.replace(/^↩ .*?\n\n/, "").slice(0, 60)}${replyTo.content.length > 60 ? "…" : ""}"\n\n${messageText}`
      : messageText;

    // OPTIMISTIC UPDATE: Add message to local state immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      senderId: currentUserId,
      sender: { name: "You" }, 
      content: finalContent,
      sentAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Clear input immediately so user can type the next message
    setContent("");
    setReplyTo(null);

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId, content: finalContent }),
      });

      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast.error("Failed to send message");
      }
      
      fetchMessages();
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
  };

  const confirmSendFile = async () => {
    if (!pendingFile) return;
    setIsUploading(true);
    setPendingFile(null);
    try {
      const formData = new FormData();
      formData.append("file", pendingFile);
      const uploadRes = await fetch("/api/messages/upload", { method: "POST", body: formData });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url, name } = await uploadRes.json();

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          internshipId, 
          content: content.trim() || `📎 Sent a file: ${name}`,
          attachmentUrl: url,
          attachmentName: name
        }),
      });

      if (!res.ok) throw new Error("Send failed");
      setContent("");
      fetchMessages();
      toast.success("File sent successfully");
    } catch (error) {
      toast.error("Failed to send file");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);

    // OPTIMISTIC UPDATE: Remove message immediately
    const originalMessages = [...messages];
    setMessages(prev => prev.filter(m => m.id !== id));

    try {
      const res = await fetch(`/api/messages/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Message deleted");
    } catch (error) {
      // Rollback on error
      setMessages(originalMessages);
      toast.error("Failed to delete message");
    }
  };

  const handleAction = async (messageId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch(`/api/messages/${messageId}/action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Action failed");
      toast.success(`Document ${status.toLowerCase()}`);
      fetchMessages();
    } catch (error) {
      toast.error("Failed to process action");
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full min-w-0 bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden relative w-full">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        dir="ltr"
        className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col"
      >
        {filteredMessages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isMe={String(msg.senderId) === String(currentUserId)}
            isAdmin={isAdmin}
            onAction={(status) => handleAction(msg.id, status)}
            onReply={(m) => setReplyTo(m)}
            onDelete={(id) => setDeleteTarget(id)}
          />
        ))}
        {filteredMessages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px]">
            {searchQuery ? "No messages match your search." : "No messages yet. Start the conversation."}
          </div>
        )}
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="px-4 py-2 bg-indigo-50 border-t border-indigo-100 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold text-indigo-700 mb-0.5 flex items-center gap-1">
              <span className="opacity-70">{isRTL ? "↩" : "↪"}</span>
              <span>{t("messages.replyingTo", { name: replyTo.senderId === currentUserId ? t("messages.yourself") : (replyTo.sender?.name || "User") })}</span>
            </p>
            <p className="text-[12px] text-gray-500 truncate">{replyTo.content.replace(/^↩ .*?\n\n/, "")}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input Bar */}
      <form onSubmit={handleSend} className="h-[72px] bg-white border-t border-gray-100 flex items-center px-4 space-x-3">
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          onChange={handleFileSelect} 
        />
        <button 
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
          disabled={isUploading}
          title="Attach file"
        >
          {isUploading ? (
            <div className="h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Paperclip className="h-[20px] w-[20px]" />
          )}
        </button>
        
        <input 
          ref={inputRef}
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-50 border-none focus:ring-0 text-[13px] placeholder:text-gray-400 h-[40px] px-4 rounded-md"
        />

        <Button 
          type="submit" 
          disabled={!content.trim() || isSending} 
          isLoading={isSending}
          size="sm"
          className={isRTL ? "flex-row-reverse" : ""}
        >
          <Send className={`h-4 w-4 ${isRTL ? "ml-2 -scale-x-100" : "mr-2"}`} />
          {t("common.send")}
        </Button>
      </form>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs overflow-hidden">
            <div className="p-5 flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900">Delete message?</h3>
              <p className="text-[12px] text-gray-500 mt-1">This action cannot be undone.</p>
            </div>
            <div className="flex border-t border-gray-100 h-12">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 text-[13px] font-medium text-gray-500 hover:bg-gray-50 border-r border-gray-100">Cancel</button>
              <button onClick={handleDelete} className="flex-1 text-[13px] font-bold text-red-600 hover:bg-red-50">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* File Confirmation Modal */}
      {pendingFile && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xs overflow-hidden">
            <div className="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <Paperclip className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{pendingFile.name}</p>
                  <p className="text-[11px] text-gray-400">{(pendingFile.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <p className="text-[12px] text-gray-500">Send this file to the group?</p>
            </div>
            <div className="flex border-t border-gray-100 h-12">
              <button onClick={() => setPendingFile(null)} className="flex-1 text-[13px] font-medium text-gray-500 hover:bg-gray-50 border-r border-gray-100">Cancel</button>
              <button onClick={confirmSendFile} className="flex-1 text-[13px] font-bold text-indigo-600 hover:bg-indigo-50">Send File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
