import React from "react";
import { Check, Clock, X, Lock } from "lucide-react";

interface Step {
  id: string;
  name: string;
  status: "completed" | "current" | "pending" | "rejected";
  actor?: string;
  timestamp?: string;
  description?: string;
}

interface InternshipTimelineProps {
  steps: Step[];
}

export const InternshipTimeline: React.FC<InternshipTimelineProps> = ({ steps }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-md p-6">
      <h2 className="text-[15px] font-semibold text-gray-900 mb-6 uppercase tracking-wider">Internship Workflow Progress</h2>
      
      <div className="relative space-y-8">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="relative flex items-start">
              {/* Connector Line */}
              {!isLast && (
                <div 
                  className={`absolute left-[9px] top-[24px] w-[1px] h-[calc(100%+8px)] 
                    ${step.status === "completed" ? "bg-green-500" : "bg-gray-200"}`}
                />
              )}

              {/* Icon */}
              <div className="relative z-10 flex items-center justify-center">
                {step.status === "completed" ? (
                  <div className="h-[20px] w-[20px] rounded-full bg-green-500 flex items-center justify-center text-white">
                    <Check className="h-3 w-3" />
                  </div>
                ) : step.status === "current" ? (
                  <div className="h-[20px] w-[20px] rounded-full bg-amber-500 flex items-center justify-center text-white">
                    <Clock className="h-3 w-3" />
                  </div>
                ) : step.status === "rejected" ? (
                  <div className="h-[20px] w-[20px] rounded-full bg-red-500 flex items-center justify-center text-white">
                    <X className="h-3 w-3" />
                  </div>
                ) : (
                  <div className="h-[20px] w-[20px] rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400">
                    <Lock className="h-3 w-3" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-[13px] font-medium ${step.status === "pending" ? "text-gray-400" : "text-gray-900"}`}>
                    {step.name}
                  </h3>
                  {step.timestamp && (
                    <span className="text-[11px] text-gray-400 font-mono">{step.timestamp}</span>
                  )}
                </div>
                
                {step.actor && (
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Acted by: <span className="font-medium">{step.actor}</span>
                  </p>
                )}

                {step.description && step.status !== "pending" && (
                  <p className={`mt-2 p-3 text-[13px] rounded bg-gray-50 border-l-2 ${step.status === "rejected" ? "border-red-500 text-red-700" : "border-gray-200 text-gray-600"}`}>
                    {step.description}
                  </p>
                )}
                
                {step.status === "rejected" && (
                  <button className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 uppercase tracking-wider">
                    Resubmit Topic →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
