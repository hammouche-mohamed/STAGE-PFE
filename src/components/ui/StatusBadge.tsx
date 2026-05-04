import React from "react";

export type StatusType = 
  | "PENDING_ADMIN"
  | "PENDING"
  | "APPROVED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "HELD"
  | "OPEN_FOR_SELECTION"
  | "TAKEN";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusMap: Record<string, { label: string; classes: string }> = {
  PENDING_ADMIN: { label: "Pending Admin", classes: "bg-amber-100 text-amber-700" },
  PENDING: { label: "Pending", classes: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approved", classes: "bg-green-100 text-green-700" },
  ACCEPTED: { label: "Accepted", classes: "bg-green-100 text-green-700" },
  REJECTED: { label: "Rejected", classes: "bg-red-100 text-red-700" },
  CANCELLED: { label: "Cancelled", classes: "bg-red-100 text-red-700" },
  IN_PROGRESS: { label: "In Progress", classes: "bg-blue-100 text-blue-700" },
  COMPLETED: { label: "Completed", classes: "bg-indigo-100 text-indigo-700" },
  HELD: { label: "Held", classes: "bg-indigo-100 text-indigo-700" },
  OPEN_FOR_SELECTION: { label: "Open", classes: "bg-purple-100 text-purple-700" },
  TAKEN: { label: "Taken", classes: "bg-gray-100 text-gray-600" },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = "" }) => {
  const config = statusMap[status] || { label: status, classes: "bg-gray-100 text-gray-600" };

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] sm:text-[11px] font-medium whitespace-nowrap ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
};
