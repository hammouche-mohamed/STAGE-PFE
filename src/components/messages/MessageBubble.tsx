import React from "react";
import { format } from "date-fns";
import { FileIcon, Download } from "lucide-react";

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

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  isAdmin: boolean;
  onAction?: (action: "APPROVED" | "REJECTED") => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  isAdmin,
  onAction 
}) => {
  return (
    <div className={`flex flex-col mb-4 ${isMe ? "items-end" : "items-start"}`}>
      <div className="flex items-center mb-1">
        <span className="text-[11px] font-semibold text-gray-900 mx-1">{message.senderName}</span>
        <span className="text-[10px] text-gray-400">{format(new Date(message.sentAt), "HH:mm")}</span>
      </div>

      <div className={`max-w-[80%] rounded-md p-3 text-[13px] shadow-sm
        ${isMe ? "bg-indigo-100 text-gray-900" : "bg-white border border-gray-200 text-gray-800"}
        ${message.requiresAction ? "bg-amber-50 border-amber-200" : ""}
      `}>
        {message.content}

        {/* Attachment */}
        {message.attachmentUrl && (
          <div className="mt-3 p-2 bg-white/50 rounded border border-gray-200 flex items-center justify-between">
            <div className="flex items-center min-w-0">
              <FileIcon className="h-4 w-4 text-gray-400 mr-2 shrink-0" />
              <span className="text-[11px] font-medium truncate">{message.attachmentName}</span>
            </div>
            <a 
              href={message.attachmentUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-indigo-600 hover:text-indigo-700"
            >
              <Download className="h-4 w-4" />
            </a>
          </div>
        )}

        {/* Action Buttons for Admin */}
        {message.requiresAction && isAdmin && message.actionStatus === "PENDING" && (
          <div className="mt-3 flex space-x-2 pt-3 border-t border-amber-200">
            <button 
              onClick={() => onAction?.("APPROVED")}
              className="flex-1 px-3 py-1.5 bg-green-600 text-white text-[11px] font-semibold rounded hover:bg-green-700 transition-colors"
            >
              Approve Document
            </button>
            <button 
              onClick={() => onAction?.("REJECTED")}
              className="flex-1 px-3 py-1.5 bg-red-600 text-white text-[11px] font-semibold rounded hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        )}

        {/* Action Status Status */}
        {message.requiresAction && message.actionStatus !== "PENDING" && (
          <div className={`mt-2 text-[10px] font-bold uppercase tracking-wider
            ${message.actionStatus === "APPROVED" ? "text-green-600" : "text-red-600"}
          `}>
            {message.actionStatus}
          </div>
        )}
      </div>
    </div>
  );
};
