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
  /** Who is reviewing — so each party only sees its OWN pending decision. */
  viewerRole?: "TEACHER" | "COMPANY";
}

export const DocumentList: React.FC<DocumentListProps> = ({ documents, onReview, onDelete, canReview, viewerRole }) => {
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

  // Small "who has validated so far" chips, shown next to the status.
  const renderApprovalChips = (doc: InternshipDocument) => {
    if (!doc.approvedByTeacher && !doc.approvedByCompany) return null;
    return (
      <div className="flex flex-wrap items-center gap-1">
        {doc.approvedByTeacher && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
            <Check className="h-2.5 w-2.5" />
            {t("dashboard.supervisor", { defaultValue: "Supervisor" })}
          </span>
        )}
        {doc.approvedByCompany && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40 px-1.5 py-0.5 text-[10px] font-semibold text-green-700 dark:text-green-400">
            <Check className="h-2.5 w-2.5" />
            {t("documents.companyShort", { defaultValue: "Company" })}
          </span>
        )}
      </div>
    );
  };

  // A missing/empty fileUrl would make the <a> navigate to the current page
  // (the "blank page" symptom). Build explicit URLs and disable the buttons
  // when there is no file.
  const fileLinks = (doc: InternshipDocument) => {
    if (!doc.fileUrl) return null;
    const sep = doc.fileUrl.includes("?") ? "&" : "?";
    return {
      view: doc.fileUrl,
      download: `${doc.fileUrl}${sep}download=1&name=${encodeURIComponent(doc.fileName)}`,
    };
  };

  const renderActions = (doc: InternshipDocument) => {
    const links = fileLinks(doc);
    return (
    <div className="flex items-center justify-end space-x-1">
      {links ? (
        <>
          <a
            href={links.view}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </a>
          <a
            href={links.download}
            className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-all"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
        </>
      ) : (
        <span
          className="p-1.5 text-gray-300 dark:text-slate-700 cursor-not-allowed"
          title={t("documents.fileUnavailable", { defaultValue: "File unavailable" })}
        >
          <Eye className="h-4 w-4" />
        </span>
      )}

      {canReview && doc.status === "UPLOADED" && (() => {
        const alreadyReviewed =
          (viewerRole === "TEACHER" && doc.approvedByTeacher) ||
          (viewerRole === "COMPANY" && doc.approvedByCompany);

        if (alreadyReviewed) {
          return (
            <>
              <span className="mx-1 h-4 w-px bg-gray-200 dark:bg-slate-700" aria-hidden="true" />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <Check className="h-3.5 w-3.5" />
                {t("documents.youApprovedAwaiting", {
                  defaultValue: "You approved — awaiting the other party",
                })}
              </span>
            </>
          );
        }

        return (
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
        );
      })()}

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
  };

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
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <StatusBadge status={doc.status} />
                  {renderApprovalChips(doc)}
                </div>
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

      {/* Desktop (>=768px): full table. table-fixed + colgroup keeps every
          column within the card so the whole row is visible with no
          horizontal scroll; cell padding is tightened to fit. */}
      <div className="admin-table-container hidden md:block overflow-x-hidden [&_td]:!px-3 [&_th]:!px-3 [&_td]:!py-3.5">
        <table className="admin-table table-fixed">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[27%]" />
            <col className="w-[8%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[20%]" />
          </colgroup>
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
                    <div className="flex items-center min-w-0">
                      <FileIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mr-2 shrink-0" />
                      <span className="truncate text-gray-900 dark:text-white" title={doc.fileName}>{doc.fileName}</span>
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
                    <div className="flex flex-col items-start gap-1.5">
                      <StatusBadge status={doc.status} />
                      {renderApprovalChips(doc)}
                    </div>
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
