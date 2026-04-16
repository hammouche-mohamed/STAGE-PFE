"use client";

import React, { useEffect, useState } from "react";
import { DocumentList } from "@/components/documents/DocumentList";
import { toast } from "sonner";
import { Search } from "lucide-react";

export default function TeacherDocumentsPage() {
  const [documents, setDocuments] = useState([]);
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
        toast.error("Failed to load internships");
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
      toast.error("Failed to load documents");
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
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Document Reviews</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Review and approve reports submitted by your students.</p>
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
            Refresh
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

// Simple Button proxy since I didn't export it globally yet or just use raw HTML
function Button({ children, variant, className, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`h-[36px] px-4 text-[13px] font-medium rounded-md transition ${variant === "outline" ? "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700" : "bg-indigo-600 text-white hover:bg-indigo-700"} ${className}`}
    >
      {children}
    </button>
  );
}
