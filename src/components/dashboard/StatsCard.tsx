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
    red: "text-red-600",
    green: "text-green-600",
    gray: "text-gray-400",
    amber: "text-amber-600"
  };

  return (
    <div className="bg-white border border-gray-200 rounded-md p-5 flex flex-col justify-between h-[100px] shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        {badge}
      </div>
      
      <div className="flex items-end justify-between mt-1">
        <h3 className="text-[20px] font-semibold text-gray-900 leading-none">{value}</h3>
        {subValue && (
          <span className={`text-[11px] font-medium ${colorMap[subValueColor]}`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
};
