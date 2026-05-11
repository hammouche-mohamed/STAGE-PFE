import React from "react";
import { LucideIcon } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon: Icon, title, description, action }) => {
  const { isRTL } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-900/50 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl text-center">
      <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="text-[17px] font-bold text-gray-900 dark:text-white">{title}</h3>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
};
