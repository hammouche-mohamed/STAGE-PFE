"use client";

import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { InternshipTimeline } from "@/components/internship/InternshipTimeline";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";
import { Clock, MessageSquare, AlertCircle } from "lucide-react";

export default function StudentDashboard() {
  // Mock data for initial UI build
  const stats = {
    status: "IN_PROGRESS",
    nextDeadline: "2024-11-20T17:00:00Z",
    deadlineTitle: "Mid-term Report",
    docsSubmitted: 2,
    totalDocs: 4,
  };

  const timelineSteps = [
    { 
      id: "1", 
      name: "Topic Proposal Submitted", 
      status: "completed", 
      actor: "Salim (Student)", 
      timestamp: "Oct 12, 10:30",
      description: "Topic: Design of a microservices-based student portal."
    },
    { 
      id: "2", 
      name: "Admin Review & Validation", 
      status: "completed", 
      actor: "Admin (Academic)", 
      timestamp: "Oct 14, 09:15",
      description: "Proposed topic meets university standards."
    },
    { 
      id: "3", 
      name: "Agreement Document Exchange", 
      status: "completed", 
      actor: "Salim (Student)", 
      timestamp: "Oct 15, 14:00",
      description: "Signed internship agreement uploaded and approved by Admin."
    },
    { 
      id: "4", 
      name: "Teacher Acceptance", 
      status: "current", 
      actor: "Dr. Benali (Teacher)", 
      description: "Waiting for teacher to formally accept co-supervision (Expected within 48h)."
    },
    { 
      id: "5", 
      name: "Final Administrative Approval", 
      status: "pending",
    },
    { 
      id: "6", 
      name: "Internship Started", 
      status: "pending",
    },
  ];

  const deadlines = [
    { title: "Mid-term Report Submission", date: "Nov 20, 2024", urgent: true },
    { title: "3rd Mini-presentation", date: "Dec 05, 2024", urgent: false },
    { title: "Final Report Draft", date: "Jan 12, 2025", urgent: false },
  ];

  const recentMessages = [
    { sender: "Admin", content: "Please ensure your insurance certificate is included...", time: "2h ago" },
    { sender: "System", content: "Reminder: Mini-presentation #2 scheduled for tomorrow.", time: "5h ago" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Row: Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard 
          label="Current Status" 
          value="In Progress" 
          badge={<StatusBadge status={stats.status} />}
        />
        <StatsCard 
          label="Next Deadline" 
          value="In 4 days" 
          subValue={stats.deadlineTitle}
          subValueColor="red"
          icon={Clock}
        />
        <StatsCard 
          label="Documents Progress" 
          value={`${stats.docsSubmitted} / ${stats.totalDocs}`} 
          subValue="50% Uploaded"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Timeline (65%) */}
        <div className="lg:col-span-2 space-y-6">
          <InternshipTimeline steps={timelineSteps as any} />
        </div>

        {/* Right Column: Sidebar info (35%) */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2 text-indigo-600" />
              Deadlines
            </h3>
            <div className="space-y-4">
              {deadlines.map((d, i) => (
                <div key={i} className={`flex flex-col p-2.5 rounded border ${d.urgent ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
                  <span className={`text-[11px] font-mono ${d.urgent ? "text-red-700" : "text-gray-500"}`}>{d.date}</span>
                  <span className="text-[13px] font-medium text-gray-800 mt-0.5">{d.title}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest text-center">
              View All Deadlines →
            </button>
          </div>

          {/* Recent Messages */}
          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
            <h3 className="text-[13px] font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-indigo-600" />
              Messages
            </h3>
            <div className="space-y-4">
              {recentMessages.map((m, i) => (
                <div key={i} className="flex flex-col border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[11px] font-semibold text-gray-900">{m.sender}</span>
                    <span className="text-[10px] text-gray-400">{m.time}</span>
                  </div>
                  <p className="text-[13px] text-gray-600 line-clamp-1">{m.content}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest text-center">
              Open Chat →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
