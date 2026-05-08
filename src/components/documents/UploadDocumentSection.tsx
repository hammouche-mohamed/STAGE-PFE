"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { FileUp, Info, FileText, X, Loader2 } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface UploadDocumentSectionProps {
  internshipId: string;
  onUploadSuccess?: () => void;
}

// DOCUMENT_TYPES moved inside component to use translations

export const UploadDocumentSection: React.FC<UploadDocumentSectionProps> = ({ 
  internshipId, 
  onUploadSuccess 
}) => {
  const { t } = useTranslation();
  
  const DOCUMENT_TYPES = [
    { value: "PROGRESS_REPORT", label: t("documents.types.PROGRESS_REPORT") },
    { value: "MID_REPORT", label: t("documents.types.MID_REPORT") },
    { value: "FINAL_REPORT", label: t("documents.types.FINAL_REPORT") },
    { value: "OTHER", label: t("documents.types.OTHER") },
  ];

  const [selectedType, setSelectedType] = useState(DOCUMENT_TYPES[0].value);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > 16 * 1024 * 1024) {
        toast.error("File size exceeds 16MB limit");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSyncMetadata = async (res: any) => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          internshipId,
          type: selectedType,
          fileName: res.name,
          fileUrl: res.url,
          fileSize: res.size,
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

  const handleUploadClick = async () => {
    if (!selectedFile) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("type", selectedType);
      formData.append("internshipId", internshipId);

      const response = await fetch("/api/upload/document", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to upload document");
      }

      await handleSyncMetadata(result);
      setSelectedFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "An unexpected error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-6 text-indigo-700">
        <FileUp className="h-5 w-5" />
        <h2 className="text-[15px] font-semibold uppercase tracking-wider">{t("documents.uploadNew")}</h2>
      </div>

      <div className="space-y-6">
        <div className="w-full">
          <label className="admin-form-label">{t("documents.categoryLabel")}</label>
          <select 
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="admin-input"
            disabled={isUploading || isSyncing}
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <p className="mt-2 text-[11px] text-gray-400 flex items-start">
            <Info className="h-3 w-3 mr-1 mt-0.5 shrink-0" />
            {t("documents.pdfRequired")}
          </p>
        </div>

        <div className="space-y-4">
          <label className="admin-form-label">{t("documents.selectFileLabel")}</label>
          
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
            accept=".pdf,image/*,.doc,.docx"
          />

          {!selectedFile ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-md bg-gray-50/50 hover:bg-gray-50 hover:border-indigo-200 transition-all cursor-pointer"
            >
              <div className="h-10 w-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                <FileUp className="h-5 w-5 text-indigo-600" />
              </div>
              <span className="text-[13px] font-medium text-gray-900">{t("documents.chooseFile")}</span>
              <span className="text-[11px] text-gray-400 mt-1">{t("documents.dragDrop")}</span>
            </div>
          ) : (
            <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 bg-white rounded flex items-center justify-center shadow-sm">
                    <FileText className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-gray-900 truncate max-w-[180px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedFile(null)}
                  className="p-1 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-red-500"
                  disabled={isUploading || isSyncing}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <Button 
                onClick={handleUploadClick}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 h-[38px] text-[13px]"
                disabled={isUploading || isSyncing}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("documents.uploading")}
                  </>
                ) : (
                  t("documents.addFile")
                )}
              </Button>
            </div>
          )}
        </div>

        {isSyncing && (
          <div className="flex items-center justify-center space-x-2 text-[13px] text-gray-500 animate-pulse">
            <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce" />
            <span>{t("documents.syncing")}</span>
          </div>
        )}
      </div>
    </div>
  );
};
