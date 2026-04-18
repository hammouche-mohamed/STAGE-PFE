"use client";

import React, { useEffect, useState, Suspense } from "react";
import { 
  Milestone as MilestoneIcon, 
  MapPin, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Info,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function MilestonesContent() {
  const searchParams = useSearchParams();
  const backUrl = searchParams.get("back") || "/student/internship";

  const [milestones, setMilestones] = useState([
    {
      id: "1",
      title: "Mini-Presentation 1: Project Scope",
      scheduledAt: new Date(2024, 4, 15, 10, 0),
      room: "Room 101B",
      status: "COMPLETED",
      feedback: "Good start. Focus more on the technical stack in the next session."
    },
    {
      id: "2",
      title: "Mini-Presentation 2: Technical Architecture",
      scheduledAt: new Date(2024, 4, 25, 14, 0),
      room: "Room 205",
      status: "SCHEDULED",
      feedback: null
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <Link 
          href={backUrl} 
          className="flex items-center text-[12px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors w-fit bg-indigo-50 px-3 py-1 rounded-full"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Internship
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900">My Milestones</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">Track your progress and upcoming mini-presentation sessions.</p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Upcoming Milestones */}
        <div className="space-y-4">
          <h2 className="text-[14px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center">
             <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
             Upcoming Sessions
          </h2>
          {milestones
            .filter(ms => new Date(ms.scheduledAt) >= new Date())
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
            .map((ms) => (
              <div key={ms.id} className="bg-white border border-gray-200 rounded-md p-6 shadow-sm overflow-hidden relative group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                       <StatusBadge status={ms.status} />
                       <span className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-widest text-indigo-600">Session {ms.id}</span>
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-900 leading-tight">{ms.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
                       <div className="flex items-center text-[12px] text-gray-600">
                          <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                          {format(ms.scheduledAt, "MMMM dd, yyyy")}
                       </div>
                       <div className="flex items-center text-[12px] text-gray-600">
                          <Clock className="h-4 w-4 mr-2 text-gray-400" />
                          {format(ms.scheduledAt, "HH:mm")}
                       </div>
                       <div className="flex items-center text-[12px] text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {ms.room}
                       </div>
                    </div>
                  </div>

                  {ms.feedback && (
                    <div className="md:max-w-[300px] p-3 bg-indigo-50 rounded-md border border-indigo-100 italic text-[12px] text-indigo-800">
                      <span className="font-bold not-italic text-[10px] uppercase block mb-1">Supervisor Feedback:</span>
                       "{ms.feedback}"
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>

        {/* Passed Milestones */}
        <div className="space-y-4">
          <h2 className="text-[14px] font-bold text-gray-500 border-b border-gray-100 pb-2 flex items-center mt-8">
             <div className="h-2 w-2 rounded-full bg-gray-300 mr-2" />
             Passed Sessions
          </h2>
          {milestones
            .filter(ms => new Date(ms.scheduledAt) < new Date())
            .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
            .map((ms) => (
              <div key={ms.id} className="bg-white border border-gray-200 rounded-md p-6 opacity-60 grayscale-[0.5] shadow-sm overflow-hidden relative group">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                       <StatusBadge status={ms.status} />
                       <span className="text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-widest">Session {ms.id}</span>
                    </div>
                    <h3 className="text-[16px] font-bold text-gray-700 leading-tight">{ms.title}</h3>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-gray-400">
                       <div className="flex items-center text-[12px]">
                          <Calendar className="h-4 w-4 mr-2" />
                          {format(ms.scheduledAt, "MMMM dd, yyyy")}
                       </div>
                       <div className="flex items-center text-[12px]">
                          <Clock className="h-4 w-4 mr-2" />
                          {format(ms.scheduledAt, "HH:mm")}
                       </div>
                       <div className="flex items-center text-[12px]">
                          <MapPin className="h-4 w-4 mr-2" />
                          {ms.room}
                       </div>
                    </div>
                  </div>

                  {ms.feedback && (
                    <div className="md:max-w-[300px] p-3 bg-gray-50 rounded-md border border-gray-100 italic text-[12px] text-gray-500">
                      <span className="font-bold not-italic text-[10px] uppercase block mb-1">Supervisor Feedback:</span>
                       "{ms.feedback}"
                    </div>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-md p-4 flex items-start gap-3">
         <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
         <div>
            <p className="text-[13px] font-bold text-amber-900">About Milestones</p>
            <p className="text-[12px] text-amber-700 leading-relaxed mt-1">
               Milestones are mandatory progress checks where you present your project status to a small committee. 
               Attendance is required to validate your final defense eligibility.
            </p>
         </div>
      </div>
    </div>
  );
}

export default function StudentMilestonesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-400">Loading milestones...</div>}>
      <MilestonesContent />
    </Suspense>
  );
}
