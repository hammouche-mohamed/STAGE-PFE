"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DocumentList } from "@/components/documents/DocumentList";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { InternshipDocument } from "@/types/document";

export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState<InternshipDocument[]>([]);
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState<any[]>([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadInternships = useCallback(async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      setInternships(data.data || []);
      if (data.data && data.data.length > 0) {
        setSelectedInternshipId(data.data[0].id);
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
          <select 
            value={selectedInternshipId}
            onChange={(e) => setSelectedInternshipId(e.target.value)}
            className="admin-input flex-1"
            disabled={internships.length === 0}
          >
            {internships.length === 0 ? (
              <option value="">{t("common.none", { defaultValue: "None" })}</option>
            ) : (
              internships.map((int: any) => (
                <option key={int.id} value={int.id}>
                  {int.topic.title} ({int.students.map((s: any) => s.student.name).join(", ")})
                </option>
              ))
            )}
          </select>
          <Button variant="outline" className="shrink-0" onClick={() => fetchDocs(selectedInternshipId)}>
            {t("common.update")}
          </Button>
        </div>
      </div>

      <DocumentList 
        documents={documents} 
        onReview={handleReview}
        canReview={true} 
      />
    </div>
  );
}

