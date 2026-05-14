import React from "react";

export type StatusType =
  | "PENDING_ADMIN"
  | "PENDING_TEACHER"
  | "PENDING"
  | "APPROVED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "REQUESTED"
  | "DOCUMENT_SENT"
  | "IN_PROGRESS"
  | "NEEDS_REVISION"
  | "FINAL_REPORT_SUBMITTED"
  | "PENDING_ADMIN_CONFIRMATION"
  | "COMPLETED"
  | "OPEN_FOR_SELECTION"
  | "TAKEN";

interface StatusBadgeProps {
  status: StatusType | string;
  label?: string;
  className?: string;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  // Topic statuses
  PENDING_ADMIN:   { label: "Pending Admin",   classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  PENDING_TEACHER: { label: "Pending Teacher", classes: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
  PENDING:         { label: "Pending",         classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  APPROVED:        { label: "Approved",        classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  ACCEPTED:        { label: "Accepted",        classes: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED:        { label: "Rejected",        classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  CANCELLED:       { label: "Cancelled",       classes: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
  OPEN_FOR_SELECTION: { label: "Open",         classes: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  TAKEN:           { label: "Taken",           classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },

  // Internship statuses
  REQUESTED:        { label: "Requested",             classes: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  DOCUMENT_SENT:    { label: "Document Sent",          classes: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400" },
  IN_PROGRESS:      { label: "In Progress",            classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  NEEDS_REVISION:   { label: "Needs Revision",         classes: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  FINAL_REPORT_SUBMITTED:     { label: "Report Submitted",      classes: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400" },
  PENDING_ADMIN_CONFIRMATION: { label: "Awaiting Admin",        classes: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
  COMPLETED:        { label: "Completed",              classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" },
  
  // Document statuses
  UPLOADED:         { label: "Uploaded",               classes: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  REVIEWED:         { label: "Reviewed",               classes: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = "" }) => {
  const config = statusMap[status] ?? { label: status, classes: "bg-gray-100 text-gray-600" };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium whitespace-nowrap ${config.classes} ${className}`}
    >
      {label ?? config.label}
    </span>
  );
};
