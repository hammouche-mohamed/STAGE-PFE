import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  subValueColor?: "red" | "green" | "gray" | "amber";
  icon?: LucideIcon;
  badge?: React.ReactNode;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  label,
  value,
  subValue,
  subValueColor = "gray",
  icon: Icon,
  badge
}) => {
  const colorMap = {
    red: "text-red-600 dark:text-red-400",
    green: "text-green-600 dark:text-green-400",
    gray: "text-gray-400 dark:text-gray-500",
    amber: "text-amber-600 dark:text-amber-400"
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 flex flex-col justify-between h-[100px] shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
        {badge}
      </div>

      <div className="flex items-end justify-between mt-1">
        <h3 className="text-[20px] font-semibold text-gray-900 dark:text-white leading-none">{value}</h3>
        {subValue && (
          <span className={`text-[11px] font-medium ${colorMap[subValueColor]}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
