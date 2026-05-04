"use client";

import React, { useEffect, useState } from "react";
import { DocumentList } from "@/components/documents/DocumentList";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const { t, isRTL } = useTranslation();
  const [internships, setInternships] = useState([]);
  const [selectedInternshipId, setSelectedInternshipId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInternships = async () => {
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
    };
    fetchInternships();
  }, []);

  const fetchDocs = async (id: string) => {
    if (!id) return;
    try {
      const docRes = await fetch(`/api/documents?internshipId=${id}`);
      const docData = await docRes.json();
      setDocuments(docData.data || []);
    } catch (error) {
      toast.error(t("toast.loadDocumentsFailed"));
    }
  };

  useEffect(() => {
    fetchDocs(selectedInternshipId);
  }, [selectedInternshipId]);

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
          <h1 className="text-[17px] font-semibold text-gray-900">{t("documents.title")}</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("documents.noDocuments")}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-md p-6">
        <label className="admin-form-label">Select Internship / Team</label>
        <div className="flex space-x-4">
          <select 
            value={selectedInternshipId}
            onChange={(e) => setSelectedInternshipId(e.target.value)}
            className="admin-input flex-1"
          >
            {internships.map((int: any) => (
              <option key={int.id} value={int.id}>
                {int.topic.title} ({int.students.map((s: any) => s.student.name).join(", ")})
              </option>
            ))}
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

