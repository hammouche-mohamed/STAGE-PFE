"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { DocumentList } from "@/components/documents/DocumentList";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ChevronDown, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { InternshipDocument } from "@/types/document";

/** Professional, softly glowing "needs attention" status dot. */
function GlowDot() {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_2px_rgba(16,185,129,0.65)]" />
    </span>
  );
}

export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState<InternshipDocument[]>([]);
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState<any[]>([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPickerOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [isPickerOpen]);

  const selectedInternship = internships.find(
    (i: any) => i.id === selectedInternshipId
  );

  const loadInternships = useCallback(async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      const list = data.data || [];
      setInternships(list);
      if (list.length > 0) {
        // Honour ?internshipId= from the detail page's "View documents" link
        // so the right internship is pre-selected (no manual re-search).
        const wanted =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("internshipId")
            : null;
        const match = wanted && list.some((i: any) => i.id === wanted);
        setSelectedInternshipId(match ? (wanted as string) : list[0].id);
      }
    } catch (error) {
      toast.error(t("toast.loadInternshipsFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  const fetchDocs = useCallback(async (id: string) => {
    if (!id) return;
    try {
      const docRes = await fetch(`/api/documents?internshipId=${id}`);
      const docData = await docRes.json();
      
      if (!docRes.ok) {
        toast.error(docData.error || t("toast.loadDocumentsFailed"));
        setDocuments([]);
        return;
      }
      
      setDocuments(docData.data || []);
    } catch (error) {
      toast.error(t("toast.loadDocumentsFailed"));
    }
  }, [t]);

  useEffect(() => {
    fetchDocs(selectedInternshipId);
  }, [selectedInternshipId, fetchDocs]);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED", comment: string) => {
    try {
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewComment: comment }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(`Document ${status.toLowerCase()}`);
      fetchDocs(selectedInternshipId);
    } catch (error) {
      toast.error(t("toast.documentStatusFailed"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("documents.title")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            {internships.length === 0 ? t("common.none") : t("documents.description")}
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6">
        <label className="admin-form-label">{t("common.internship")}</label>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1" ref={pickerRef}>
            <button
              type="button"
              disabled={internships.length === 0}
              onClick={() => setIsPickerOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={isPickerOpen}
              className="w-full flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-left text-[13px] text-gray-900 dark:text-white transition-colors hover:border-indigo-300 dark:hover:border-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                {internships.length === 0 ? (
                  <span className="text-gray-400 dark:text-gray-500">
                    {t("common.none", { defaultValue: "None" })}
                  </span>
                ) : selectedInternship ? (
                  <>
                    {(selectedInternship.pendingDocuments ?? 0) > 0 && <GlowDot />}
                    <span className="truncate font-medium">
                      {selectedInternship.topic.title}
                    </span>
                    <span className="hidden sm:inline truncate text-gray-500 dark:text-gray-400">
                      ({selectedInternship.students.map((s: any) => s.student.name).join(", ")})
                    </span>
                    {(selectedInternship.pendingDocuments ?? 0) > 0 && (
                      <span className="shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                        {selectedInternship.pendingDocuments} {t("documents.toReview", { defaultValue: "to review" })}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">
                    {t("common.select", { defaultValue: "Select…" })}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isPickerOpen ? "rotate-180" : ""}`}
              />
            </button>

            {isPickerOpen && internships.length > 0 && (
              <ul
                role="listbox"
                className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl"
              >
                {internships.map((int: any) => {
                  const needsReview = (int.pendingDocuments ?? 0) > 0;
                  const isSelected = int.id === selectedInternshipId;
                  return (
                    <li key={int.id} role="option" aria-selected={isSelected}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInternshipId(int.id);
                          setIsPickerOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-[13px] transition-colors ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800"
                        }`}
                      >
                        {needsReview ? (
                          <GlowDot />
                        ) : (
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full border border-gray-300 dark:border-slate-600" />
                        )}
                        <span className="truncate font-medium">{int.topic.title}</span>
                        <span className="truncate text-gray-500 dark:text-gray-400">
                          ({int.students.map((s: any) => s.student.name).join(", ")})
                        </span>
                        {needsReview && (
                          <span className="ml-auto shrink-0 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            {int.pendingDocuments} {t("documents.toReview", { defaultValue: "to review" })}
                          </span>
                        )}
                        {isSelected && !needsReview && (
                          <Check className="ml-auto h-4 w-4 shrink-0 text-indigo-500" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Button variant="outline" className="shrink-0" onClick={() => fetchDocs(selectedInternshipId)}>
            {t("common.update")}
          </Button>
        </div>
      </div>

      <DocumentList
        documents={documents}
        onReview={handleReview}
        canReview={true}
        viewerRole="TEACHER"
      />
    </div>
  );
}

