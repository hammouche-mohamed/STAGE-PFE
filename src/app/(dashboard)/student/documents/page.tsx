"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { DocumentList } from "@/components/documents/DocumentList";
import { MilestonesPanel } from "@/components/documents/MilestonesPanel";
import { toast } from "sonner";
import { Info, ChevronLeft, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { InternshipDocument } from "@/types/document";

function DocumentsContent() {
  const searchParams = useSearchParams();
  const { t, isRTL } = useTranslation();
  const backUrl = searchParams.get("back") || "/student/internship";
  
  const [documents, setDocuments] = useState<InternshipDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [internshipId, setInternshipId] = useState<string | null>(null);
  // Track whether the active internship is PFE — milestones / deadlines panel
  // is PFE-only since NORMAL internships don't run intermediate presentations.
  const [isPfe, setIsPfe] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchInternshipAndDocs = useCallback(async () => {
    try {
      const intRes = await fetch("/api/internships");
      const intData = await intRes.json();

      const internships = intData.data || [];
      const activeInternship = internships.find((i: any) => i.status !== "CANCELLED");

      if (activeInternship) {
        const activeIntId = activeInternship.id;
        setInternshipId(activeIntId);
        setIsPfe(
          activeInternship.internshipType === "PFE" ||
            activeInternship.topic?.internshipType === "PFE",
        );

        const docRes = await fetch(`/api/documents?internshipId=${activeIntId}`);
        const docData = await docRes.json();
        setDocuments(docData.data || []);
      }
    } catch (error) {
      toast.error(t("toast.loadDocumentsFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchInternshipAndDocs();
  }, [fetchInternshipAndDocs]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete document");
      toast.success(t("toast.documentDeleted"));
      fetchInternshipAndDocs();
    } catch (error) {
      toast.error(t("toast.documentDeleteFailed"));
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <Link 
          href={backUrl} 
          className="flex items-center text-[12px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium transition-colors w-fit bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full"
        >
          <ChevronLeft className={`h-4 w-4 ${isRTL ? "ml-1 rotate-180" : "mr-1"}`} />
          {t("common.back")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">
              {isPfe ? `${t("documents.title")} & ${t("common.deadlines", { defaultValue: "Deadlines" })}` : t("documents.title")}
            </h1>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
              {!internshipId ? t("common.none") : t("common.documents")}
            </p>
          </div>
        </div>
      </div>

      {!internshipId && !isLoading ? (
        <div className="p-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-md flex flex-col items-center justify-center text-center">
          <Info className="h-8 w-8 text-amber-500 dark:text-amber-400 mb-2" />
          <p className="text-[14px] font-medium text-amber-800 dark:text-amber-500">{t("dashboard.noInternship")}</p>
          <p className="text-[12px] text-amber-600 dark:text-amber-400/80 mt-1">{t("internship.noInternship")}</p>
        </div>
      ) : (
        <div className="space-y-6">
          <DocumentList
            documents={documents}
            canReview={false}
            onDelete={(id) => setDeleteId(id)}
          />

          {/* Deadlines / milestones panel — PFE-only since NORMAL internships
              don't run mini-presentations. Submission happens from the
              per-milestone "Upload document" button below, so the generic
              UploadDocumentSection is gone. */}
          {internshipId && isPfe && (
            <MilestonesPanel internshipId={internshipId} />
          )}

          <div className="p-5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-md">
            <h3 className="text-[13px] font-semibold text-indigo-900 dark:text-indigo-400 uppercase tracking-widest mb-3">{t("documents.guidelines")}</h3>
            <ul className="text-[12px] text-indigo-700 dark:text-indigo-300 list-disc list-inside space-y-2">
              <li>{t("documents.guideline1")}</li>
              <li>{t("documents.guideline2")}</li>
              <li>{t("documents.guideline3")}</li>
              <li>{t("documents.guideline4")}</li>
            </ul>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title={t("common.delete") + " " + t("common.documents")}
        description={t("messages.deleteConfirm")}
        isLoading={isDeleting}
      />
    </div>
  );
}

export default function StudentDocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading…</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
