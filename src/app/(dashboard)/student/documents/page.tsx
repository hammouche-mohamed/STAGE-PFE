"use client";

import React, { useEffect, useState } from "react";
import { DocumentList } from "@/components/documents/DocumentList";
import { UploadDocumentSection } from "@/components/documents/UploadDocumentSection";
import { toast } from "sonner";
import { Info } from "lucide-react";

export default function StudentDocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Real app: get internshipId from current user's active internship
  const [internshipId, setInternshipId] = useState<string | null>(null);

  const fetchInternshipAndDocs = async () => {
    try {
      // 1. Get active internship
      const intRes = await fetch("/api/internships");
      const intData = await intRes.json();
      
      if (intData.data && intData.data.length > 0) {
        const activeIntId = intData.data[0].id; // Simple heuristic: first one is active
        setInternshipId(activeIntId);

        // 2. Get documents
        const docRes = await fetch(`/api/documents?internshipId=${activeIntId}`);
        const docData = await docRes.json();
        setDocuments(docData.data || []);
      }
    } catch (error) {
      toast.error("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInternshipAndDocs();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Internship Documents</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Upload and manage your PFE reports and attachments.</p>
        </div>
      </div>

      {!internshipId && !isLoading ? (
        <div className="p-8 bg-amber-50 border border-amber-200 rounded-md flex flex-col items-center justify-center text-center">
          <Info className="h-8 w-8 text-amber-500 mb-2" />
          <p className="text-[14px] font-medium text-amber-800">No active internship found.</p>
          <p className="text-[12px] text-amber-600 mt-1">You must have an approved internship to manage documents.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Main List (2/3) */}
          <div className="xl:col-span-2 space-y-6">
            <DocumentList 
              documents={documents} 
              canReview={false} // Student can't review their own docs
            />
          </div>

          {/* Upload Section (1/3) */}
          <div className="space-y-6">
            {internshipId && (
              <UploadDocumentSection 
                internshipId={internshipId} 
                onUploadSuccess={fetchInternshipAndDocs}
              />
            )}
            
            <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-md">
              <h3 className="text-[13px] font-semibold text-indigo-900 uppercase tracking-widest mb-3">Submission Guidelines</h3>
              <ul className="text-[12px] text-indigo-700 list-disc list-inside space-y-2">
                <li>Reports must be in PDF format.</li>
                <li>Each upload creates a new version.</li>
                <li>Your supervisor will be notified automatically.</li>
                <li>Admin approval is required for the final report.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
