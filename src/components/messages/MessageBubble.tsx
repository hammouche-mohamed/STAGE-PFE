import React, { useState } from "react";
import { format } from "date-fns";
import { FileIcon, Download, CornerUpLeft, Trash2 } from "lucide-react";

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

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  isAdmin: boolean;
  onAction?: (action: "APPROVED" | "REJECTED") => void;
  onReply?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  isAdmin,
  onAction,
  onReply,
  onDelete
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const parseReply = (content: string) => {
    if (!content.startsWith("↩ ")) return { quoted: null, text: content };
    const nlIdx = content.indexOf("\n\n");
    if (nlIdx === -1) return { quoted: null, text: content };
    return { quoted: content.slice(0, nlIdx), text: content.slice(nlIdx + 2) };
  };

  const { quoted, text } = parseReply(message.content);

  return (
    <div
      className={`flex flex-col mb-4 ${isMe ? "items-end" : "items-start"}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={`flex items-center mb-1 ${isMe ? "flex-row-reverse" : ""}`}>
        <span className="text-[11px] font-semibold text-gray-900 mx-1">{message.sender?.name}</span>
        <span className="text-[10px] text-gray-400">{format(new Date(message.sentAt), "HH:mm")}</span>
      </div>

      <div 
        className={`flex items-center gap-2 group w-fit max-w-[100%] ${isMe ? "flex-row-reverse" : "flex-row"}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {!isMe && isHovered && (
          <button
            onClick={() => onReply?.(message)}
            className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
            title="Reply"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
          </button>
        )}

        <div className={`max-w-[100%] rounded-2xl p-3 text-[13px] shadow-sm
          ${isMe ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"}
          ${message.requiresAction ? "bg-amber-50 border-amber-200" : ""}
        `}>
          {/* Quoted reply */}
          {quoted && (
            <div className={`mb-2 px-3 py-1.5 rounded-lg text-[11px] border-l-2 ${isMe ? "bg-indigo-700 border-indigo-300 text-indigo-100" : "bg-gray-50 border-indigo-400 text-gray-500"
              }`}>
              {quoted}
            </div>
          )}

          <div dir="auto" className="whitespace-pre-wrap break-words overflow-hidden text-start">{text}</div>

          {/* Attachment */}
          {message.attachmentUrl && (
            <div className={`mt-3 p-2 rounded border flex items-center justify-between ${isMe ? "bg-indigo-700/50 border-indigo-500" : "bg-gray-50 border-gray-200"
              }`}>
              <div className="flex items-center min-w-0">
                <FileIcon className={`h-4 w-4 mr-2 shrink-0 ${isMe ? "text-indigo-200" : "text-gray-400"}`} />
                <span className={`text-[11px] font-medium truncate ${isMe ? "text-white" : "text-gray-700"}`}>
                  {message.attachmentName}
                </span>
              </div>
              <a
                href={message.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`ml-2 transition-colors ${isMe ? "text-white hover:text-indigo-100" : "text-indigo-600 hover:text-indigo-700"}`}
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

        {isMe && isHovered && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onReply?.(message)}
              className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 transition-colors"
              title="Reply"
            >
              <CornerUpLeft className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete?.(message.id)}
              className="p-1.5 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
