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
  className?: string;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  // Topic statuses
  PENDING_ADMIN:   { label: "Pending Admin",   classes: "bg-amber-100 text-amber-700" },
  PENDING_TEACHER: { label: "Pending Teacher", classes: "bg-yellow-100 text-yellow-700" },
  PENDING:         { label: "Pending",         classes: "bg-amber-100 text-amber-700" },
  APPROVED:        { label: "Approved",        classes: "bg-green-100 text-green-700" },
  ACCEPTED:        { label: "Accepted",        classes: "bg-green-100 text-green-700" },
  REJECTED:        { label: "Rejected",        classes: "bg-red-100 text-red-700" },
  CANCELLED:       { label: "Cancelled",       classes: "bg-red-100 text-red-700" },
  OPEN_FOR_SELECTION: { label: "Open",         classes: "bg-purple-100 text-purple-700" },
  TAKEN:           { label: "Taken",           classes: "bg-gray-100 text-gray-600" },

  // Internship statuses
  REQUESTED:        { label: "Requested",             classes: "bg-gray-100 text-gray-600" },
  DOCUMENT_SENT:    { label: "Document Sent",          classes: "bg-sky-100 text-sky-700" },
  IN_PROGRESS:      { label: "In Progress",            classes: "bg-blue-100 text-blue-700" },
  NEEDS_REVISION:   { label: "Needs Revision",         classes: "bg-orange-100 text-orange-700" },
  FINAL_REPORT_SUBMITTED:     { label: "Report Submitted",      classes: "bg-violet-100 text-violet-700" },
  PENDING_ADMIN_CONFIRMATION: { label: "Awaiting Admin",        classes: "bg-indigo-100 text-indigo-700" },
  COMPLETED:        { label: "Completed",              classes: "bg-emerald-100 text-emerald-700" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const config = statusMap[status] ?? { label: status, classes: "bg-gray-100 text-gray-600" };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium whitespace-nowrap ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  );
};
