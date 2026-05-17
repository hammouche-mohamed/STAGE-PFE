"use client";

import React, { useState } from "react";
import { formatShortDate } from "@/lib/utils/formatDate";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FileIcon, Eye, Check, X, MessageSquare, Trash2, Download, AlertTriangle } from "lucide-react";
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
  
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    docId: string;
    status: "APPROVED" | "REJECTED";
    title: string;
    description: string;
    comment: string;
    acknowledged: boolean;
  }>({
    isOpen: false,
    docId: "",
    status: "APPROVED",
    title: "",
    description: "",
    comment: "",
    acknowledged: false,
  });

  const handleOpenReview = (docId: string, status: "APPROVED" | "REJECTED") => {
    setReviewModal({
      isOpen: true,
      docId,
      status,
      title: status === "APPROVED" ? "Approve Document" : "Reject Document",
      description: status === "APPROVED"
        ? "You are about to APPROVE this document. Add an optional comment."
        : "You are about to REJECT this document. Please provide a clear reason.",
      comment: "",
      acknowledged: false,
    });
  };

  const handleSubmitReview = () => {
    if (reviewModal.status === "REJECTED" && !reviewModal.comment.trim()) {
      toast.error("A reason is required for rejection.");
      return;
    }
    if (!reviewModal.acknowledged) {
      toast.error("Please confirm you understand this decision is final.");
      return;
    }
    onReview?.(reviewModal.docId, reviewModal.status, reviewModal.comment);
    setReviewModal(prev => ({ ...prev, isOpen: false }));
  };

  const getTypeLabel = (type: string) => {
    return t(`documents.types.${type}` as any) || type.replace(/_/g, " ");
  };

  const renderActions = (doc: InternshipDocument) => (
    <div className="flex items-center justify-end space-x-1">
      <a
        href={doc.fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all"
        title="View"
      >
        <Eye className="h-4 w-4" />
      </a>
      <a
        href={doc.fileUrl}
        download={doc.fileName}
        className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all"
        title="Download"
      >
        <Download className="h-4 w-4" />
      </a>

      {canReview && doc.status === "UPLOADED" && (
        <>
          <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-slate-700" aria-hidden="true" />
          <button
            onClick={() => handleOpenReview(doc.id, "APPROVED")}
            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-all"
            title="Approve"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOpenReview(doc.id, "REJECTED")}
            className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
            title="Reject"
          >
            <X className="h-4 w-4" />
          </button>
        </>
      )}

      {onDelete && (
        <button
          onClick={() => onDelete(doc.id)}
          className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
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
          className="p-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-md transition-all"
          title="View Feedback"
        >
          <MessageSquare className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mobile (<768px): stacked cards — no horizontal scroll */}
      <div className="space-y-3 md:hidden">
        {documents.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg">
            {t("documents.noDocuments")}
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {getTypeLabel(doc.type)}
                  </p>
                  <div className="flex items-center mt-1">
                    <FileIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 shrink-0" />
                    <span
                      className="truncate text-[13px] font-medium text-gray-900 dark:text-white"
                      title={doc.fileName}
                    >
                      {doc.fileName}
                    </span>
                  </div>
                </div>
                <StatusBadge status={doc.status} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>
                  <span className="font-mono bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-2">
                    v{doc.version}
                  </span>
                  {doc.uploadedBy?.name || t("common.none")} ·{" "}
                  {formatShortDate(doc.uploadedAt)}
                </span>
              </div>
              <div className="border-t border-gray-100 dark:border-slate-800 pt-2">
                {renderActions(doc)}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop (>=768px): full table */}
      <div className="admin-table-container hidden md:block">
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
                <td colSpan={6} className="text-center py-8 text-gray-400 dark:text-gray-500">{t("documents.noDocuments")}</td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="admin-table-row">
                  <td className="font-semibold text-[12px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {getTypeLabel(doc.type)}
                  </td>
                  <td>
                    <div className="flex items-center">
                      <FileIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2" />
                      <span className="truncate max-w-[200px] text-gray-900 dark:text-white" title={doc.fileName}>{doc.fileName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[12px] font-mono bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">v{doc.version}</span>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-[13px] text-gray-900 dark:text-white">{doc.uploadedBy?.name || t("common.none")}</span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatShortDate(doc.uploadedAt)}</span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={doc.status} />
                  </td>
                  <td className="text-right">
                    {renderActions(doc)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={reviewModal.isOpen}
        onClose={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
        title={reviewModal.title}
        footer={
          <>
            <Button 
              variant="outline" 
              onClick={() => setReviewModal(prev => ({ ...prev, isOpen: false }))}
            >
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Button>
            <Button
              variant={reviewModal.status === "APPROVED" ? "primary" : "danger"}
              onClick={handleSubmitReview}
              disabled={
                !reviewModal.acknowledged ||
                (reviewModal.status === "REJECTED" && !reviewModal.comment.trim())
              }
            >
              {reviewModal.status === "APPROVED" ? "Approve — Final" : "Reject — Final"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">
            {reviewModal.description}
          </p>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-3 py-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[12px] text-amber-800 dark:text-amber-300">
              This decision is <strong>final</strong>. Once submitted the
              document status cannot be changed back.
            </p>
          </div>
          <label className="flex items-center gap-2 text-[12px] font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              checked={reviewModal.acknowledged}
              onChange={(e) =>
                setReviewModal(prev => ({ ...prev, acknowledged: e.target.checked }))
              }
            />
            I understand this {reviewModal.status === "APPROVED" ? "approval" : "rejection"} is final.
          </label>
          <div>
            <textarea
              className="w-full min-h-[100px] text-[13px] p-3 border border-gray-200 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y"
              placeholder={reviewModal.status === "APPROVED" ? "Optional comment..." : "Required reason..."}
              value={reviewModal.comment}
              onChange={(e) => setReviewModal(prev => ({ ...prev, comment: e.target.value }))}
              autoFocus
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
