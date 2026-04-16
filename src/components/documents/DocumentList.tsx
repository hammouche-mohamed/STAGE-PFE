"use client";

import React from "react";
import { formatShortDate } from "@/lib/utils/formatDate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileIcon, Download, Check, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Document {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  version: number;
  status: string;
  uploadedAt: string;
  uploadedBy: { name: string };
  reviewComment?: string | null;
}

interface DocumentListProps {
  documents: Document[];
  onReview?: (id: string, status: "APPROVED" | "REJECTED", comment: string) => void;
  canReview?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onReview, canReview }) => {
  const getTypeLabel = (type: string) => {
    return type.replace(/_/g, " ");
  };

  return (
    <div className="space-y-4">
      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Document Type</th>
              <th>File Name</th>
              <th>Version</th>
              <th>Uploaded By</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">No documents uploaded yet.</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="admin-table-row">
                  <td className="font-semibold text-[12px] uppercase tracking-wide text-gray-500">
                    {getTypeLabel(doc.type)}
                  </td>
                  <td>
                    <div className="flex items-center">
                      <FileIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="truncate max-w-[200px]" title={doc.fileName}>{doc.fileName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[12px] font-mono bg-gray-100 px-1.5 py-0.5 rounded">v{doc.version}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-[13px]">{doc.uploadedBy.name}</span>
                      <span className="text-[11px] text-gray-400">{formatShortDate(doc.uploadedAt)}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors"
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                      
                      {canReview && doc.status === "UPLOADED" && (
                        <>
                          <button 
                            onClick={() => {
                              const comment = prompt("Add a comment (optional):") || "";
                              onReview?.(doc.id, "APPROVED", comment);
                            }}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const comment = prompt("Reason for rejection:") || "";
                              if (!comment) return;
                              onReview?.(doc.id, "REJECTED", comment);
                            }}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {doc.reviewComment && (
                        <button 
                          onClick={() => {
                            toast.info(doc.reviewComment as string);
                          }}
                          className="p-1 text-amber-600 hover:bg-amber-50 rounded"
                          title="View Feedback"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
