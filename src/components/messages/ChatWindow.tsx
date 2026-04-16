"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { Button } from "@/components/ui/Button";
import { Paperclip, Send } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
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
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  internshipId, 
  currentUserId,
  isAdmin 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internshipId, content }),
      });

      if (!res.ok) throw new Error("Send failed");
      
      setContent("");
      fetchMessages();
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
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
    <div className="flex flex-col h-[520px] bg-white border border-gray-200 rounded-md shadow-sm overflow-hidden">
      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 bg-gray-50 flex flex-col"
      >
        {messages.map((msg) => (
          <MessageBubble 
            key={msg.id} 
            message={msg} 
            isMe={msg.senderId === currentUserId}
            isAdmin={isAdmin}
            onAction={(status) => handleAction(msg.id, status)}
          />
        ))}
        {messages.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-[13px]">
            No messages yet. Start the conversation.
          </div>
        )}
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="h-[64px] bg-white border-t border-gray-100 flex items-center px-4 space-x-3">
        <button 
          type="button"
          className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"
          title="Attach file"
        >
          <Paperclip className="h-[20px] w-[20px]" />
        </button>
        
        <input 
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-gray-50 border-none focus:ring-0 text-[13px] placeholder:text-gray-400 h-[40px] px-4 rounded-md"
        />

        <Button 
          type="submit" 
          disabled={!content.trim()} 
          isLoading={isSending}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          Send
        </Button>
      </form>
    </div>
  );
};
