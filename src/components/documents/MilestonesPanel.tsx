"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Calendar, Clock, FileText, FileUp, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { format } from "date-fns";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Milestone {
  id: string;
  internshipId: string;
  title: string;
  scheduledAt: string;
  room: string;
  timeSlot: string;
  documentDeadline: string;
  status: "SCHEDULED" | "DOCUMENT_SUBMITTED" | "MISSED" | "REVIEWED" | "HELD" | "POSTPONED" | "CANCELLED";
  documentUrl: string | null;
  documentName: string | null;
  submittedAt: string | null;
  adminComment: string | null;
}

interface MilestonesPanelProps {
  internshipId: string;
}

export const MilestonesPanel: React.FC<MilestonesPanelProps> = ({ internshipId }) => {
  const { t } = useTranslation();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/mini-presentations");
      const data = await res.json();
      const filtered = (data.data || []).filter((m: Milestone) => m.internshipId === internshipId);
      setMilestones(filtered);
    } catch {
      // silent — non-critical panel
    } finally {
      setIsLoading(false);
    }
  }, [internshipId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (milestoneId: string, file: File) => {
    setUploadingId(milestoneId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "MID_REPORT");
      formData.append("internshipId", internshipId);

      const uploadRes = await fetch("/api/upload/document", { method: "POST", body: formData });
      const uploaded = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploaded.error || "Upload failed");

      const submitRes = await fetch(`/api/mini-presentations/${milestoneId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUrl: uploaded.url, fileName: uploaded.name }),
      });
      const submitted = await submitRes.json();
      if (!submitRes.ok) throw new Error(submitted.error || "Submission failed");

      toast.success("Milestone document submitted.");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Failed to submit milestone document");
    } finally {
      setUploadingId(null);
      // Reset the file input so picking the same file again re-fires onChange
      const input = fileInputs.current[milestoneId];
      if (input) input.value = "";
    }
  };

  const renderStatusBadge = (m: Milestone) => {
    if (m.status === "CANCELLED") {
      return <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400">Cancelled</span>;
    }
    if (m.status === "MISSED") {
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"><AlertTriangle className="h-3 w-3" />Missed</span>;
    }
    if (m.status === "DOCUMENT_SUBMITTED" || m.status === "REVIEWED" || m.status === "HELD") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Submitted
        </span>
      );
    }
    return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"><Clock className="h-3 w-3" />Pending</span>;
  };

  // Upload is open only while the milestone is SCHEDULED AND the deadline
  // hasn't passed. Past-deadline / MISSED / CANCELLED / already-reviewed all
  // close the window.
  const canSubmit = (m: Milestone) => {
    if (m.status !== "SCHEDULED") return false;
    return new Date(m.documentDeadline).getTime() > Date.now();
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
        <div className="animate-pulse text-[13px] text-gray-400">Loading deadlines…</div>
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400 mb-3">
          <Calendar className="h-5 w-5" />
          <h2 className="text-[15px] font-semibold uppercase tracking-wider">Deadlines & Milestones</h2>
        </div>
        <p className="text-[13px] text-gray-500 dark:text-gray-400">
          No milestones scheduled yet. The department administration will add them as the PFE timeline progresses.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-400">
          <Calendar className="h-5 w-5" />
          <h2 className="text-[15px] font-semibold uppercase tracking-wider">Deadlines & Milestones</h2>
        </div>
        <span className="text-[11px] font-medium text-gray-400 bg-gray-50 dark:bg-slate-800 px-2 py-1 rounded">
          {milestones.length} {milestones.length === 1 ? "milestone" : "milestones"}
        </span>
      </div>

      <div className="space-y-3">
        {milestones.map((m) => {
          const deadline = new Date(m.documentDeadline);
          const past = deadline.getTime() < Date.now();
          const submitting = uploadingId === m.id;
          return (
            <div
              key={m.id}
              className="border border-gray-100 dark:border-slate-800 rounded-lg p-4 bg-gray-50/40 dark:bg-slate-800/40"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 dark:text-white truncate" title={m.title}>
                    {m.title}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-y-1 sm:gap-y-1 sm:gap-x-4 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Deadline:</span>
                      {format(deadline, "PPP 'at' p")}
                    </span>
                    <span className="inline-flex items-center gap-1 flex-wrap">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span className="font-semibold text-gray-700 dark:text-gray-300">Presentation:</span>
                      {format(new Date(m.scheduledAt), "PPP")} · {m.timeSlot}
                    </span>
                    {m.room && (
                      <span className="inline-flex items-center gap-1">
                        <span className="font-semibold text-gray-700 dark:text-gray-300">Room:</span>
                        {m.room.replace(/^room\s+/i, "")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">{renderStatusBadge(m)}</div>
              </div>

              {m.documentUrl && m.documentName && (
                <a
                  href={m.documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-[12px] text-indigo-600 dark:text-indigo-400 hover:underline mb-3"
                >
                  <FileText className="h-3.5 w-3.5" />
                  {m.documentName}
                  {m.submittedAt && (
                    <span className="text-gray-400 dark:text-gray-500">
                      · submitted {format(new Date(m.submittedAt), "PP")}
                    </span>
                  )}
                </a>
              )}

              {canSubmit(m) ? (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                  <input
                    ref={(el) => { fileInputs.current[m.id] = el; }}
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleSubmit(m.id, file);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => fileInputs.current[m.id]?.click()}
                    disabled={submitting}
                    className="text-[12px]"
                  >
                    {submitting ? (
                      <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Uploading…</>
                    ) : (
                      <><FileUp className="h-3.5 w-3.5 mr-1.5" />Upload document</>
                    )}
                  </Button>
                </div>
              ) : (m.status === "SCHEDULED" && past) || m.status === "MISSED" ? (
                <div className="pt-2 border-t border-gray-100 dark:border-slate-800">
                  <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Deadline has passed — submissions are closed. Contact the administration.
                  </p>
                </div>
              ) : null}

              {m.adminComment && (
                <p className="mt-2 text-[12px] text-gray-600 dark:text-gray-300 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded p-2">
                  <span className="font-semibold">Admin note:</span> {m.adminComment}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
