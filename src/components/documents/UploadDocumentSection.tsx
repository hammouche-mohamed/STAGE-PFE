"use client";

import React, { useState } from "react";
import { UploadButton } from "@/lib/utils/uploadthing";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { FileUp, Info } from "lucide-react";

interface UploadDocumentSectionProps {
  internshipId: string;
  onUploadSuccess?: () => void;
}

const DOCUMENT_TYPES = [
  { value: "PROGRESS_REPORT", label: "Progress Report (Mini-Pres)" },
  { value: "MID_REPORT", label: "Mid-term Report" },
  { value: "FINAL_REPORT", label: "Final Report / Thesis" },
  { value: "OTHER", label: "Other Attachment" },
];

export const UploadDocumentSection: React.FC<UploadDocumentSectionProps> = ({ 
  internshipId, 
  onUploadSuccess 
}) => {
  const [selectedType, setSelectedType] = useState(DOCUMENT_TYPES[0].value);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncMetadata = async (res: any) => {
    setIsSyncing(true);
    try {
      const file = res[0];
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipId,
          type: selectedType,
          fileName: file.name,
          fileUrl: file.url,
          fileSize: file.size,
        }),
      });

      if (!response.ok) throw new Error("Failed to register document metadata");

      toast.success("Document uploaded and registered successfully");
      onUploadSuccess?.();
    } catch (error) {
      toast.error("Upload succeeded but registration failed. Please contact admin.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-6 text-indigo-700">
        <FileUp className="h-5 w-5" />
        <h2 className="text-[15px] font-semibold uppercase tracking-wider">Upload New Document</h2>
      </div>

      <div className="space-y-6">
        <div className="w-full">
          <label className="admin-form-label">Document Category</label>
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="admin-input"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-gray-400 flex items-start">
            <Info className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
            PDF format is strictly required for reports. Max size 16MB.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-md bg-gray-50/50">
          <UploadButton
            endpoint="documentUploader"
            onClientUploadComplete={(res) => {
              handleSyncMetadata(res);
            }}
            onUploadError={(error: Error) => {
              toast.error(`Upload error: ${error.message}`);
            }}
            appearance={{
              button: "bg-indigo-600 after:bg-indigo-700 h-[40px] px-6 text-[13px] font-medium rounded-md",
              allowedContent: "text-[11px] text-gray-400 mt-2",
            }}
          />
        </div>

        {isSyncing && (
          <div className="flex items-center justify-center space-x-2 text-[13px] text-gray-500 animate-pulse">
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" />
            <span>Syncing file metadata...</span>
          </div>
        )}
      </div>
    </div>
  );
};
