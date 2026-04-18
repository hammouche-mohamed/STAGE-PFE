"use client";

import React from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { AlertTriangle, AlertCircle, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  variant = "danger",
  isLoading = false,
}) => {
  const Icon = variant === "danger" ? Trash2 : AlertTriangle;
  const iconBg = variant === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600";
  const confirmButtonVariant = variant === "danger" ? "danger" : "primary";

  const footer = (
    <>
      <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
        {cancelLabel}
      </Button>
      <Button 
        variant={confirmButtonVariant} 
        size="sm" 
        onClick={onConfirm} 
        isLoading={isLoading}
      >
        {confirmLabel}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      footer={footer}
    >
      <div className="flex items-start space-x-4">
        <div className={`p-3 rounded-full ${iconBg} flex-shrink-0`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="space-y-2">
          <p className="text-[14px] text-gray-600 leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Modal>
  );
};
