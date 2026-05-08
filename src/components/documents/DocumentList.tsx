"use client";

import React from "react";
import { formatShortDate } from "@/lib/utils/formatDate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { FileIcon, Eye, Check, X, MessageSquare, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { InternshipDocument } from "@/types/document";


import { useTranslation } from "@/lib/i18n/LanguageContext";

interface DocumentListProps {
  documents: InternshipDocument[];
  onReview?: (id: string, status: "APPROVED" | "REJECTED", comment: string) => void;
  onDelete?: (id: string) => void;
  canReview?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onReview, onDelete, canReview }) => {
  const { t } = useTranslation();
  
  const getTypeLabel = (type: string) => {
    return t(`documents.types.${type}` as any) || type.replace(/_/g, " ");
  };

  return (
    <div className="space-y-4">
      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("documents.type")}</th>
              <th>{t("documents.fileName")}</th>
              <th>{t("documents.version")}</th>
              <th>{t("common.uploadedBy")}</th>
              <th>{t("common.status")}</th>
              <th className="text-right">{t("documents.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">{t("documents.noDocuments")}</td>
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
                      <span className="text-[13px]">{doc.uploadedBy?.name || "N/A"}</span>
                      <span className="text-[11px] text-gray-400">{formatShortDate(doc.uploadedAt)}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                        title="View"
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                      <a 
                        href={doc.fileUrl} 
                        download={doc.fileName}
                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
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
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-all"
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
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-all"
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}

                      {onDelete && (
                        <button 
                          onClick={() => onDelete(doc.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}

                      {doc.reviewComment && (
                        <button 
                          onClick={() => {
                            toast.info(doc.reviewComment as string);
                          }}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-all"
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
