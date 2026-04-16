"use client";

import React, { useEffect, useState } from "react";
import { 
  Milestone, 
  Search, 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  CheckCircle2, 
  Plus,
  ChevronRight,
  TrendingUp
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminMilestonesPage() {
  // Mock data for milestones (mini-presentations)
  const [milestones, setMilestones] = useState([
    {
      id: "1",
      title: "First Mini-Presentation (Context & Scope)",
      internship: { topic: { title: "AI-powered Medical Diagnosis" } },
      students: [{ student: { name: "Anis Rahmani" } }],
      scheduledAt: new Date(2024, 4, 15, 10, 0),
      room: "Room 101B",
      status: "SCHEDULED"
    },
    {
      id: "2",
      title: "Second Mini-Presentation (Design & Arch)",
      internship: { topic: { title: "Blockchain for Supply Chain" } },
      students: [{ student: { name: "Lydia Mansouri" } }],
      scheduledAt: new Date(2024, 4, 16, 14, 30),
      room: "Room 205",
      status: "PENDING"
    }
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Milestones Management</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Schedule and monitor mini-presentations for all student groups.</p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Session
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
           {milestones.map((ms) => (
             <div key={ms.id} className="bg-white border border-gray-200 rounded-md p-5 hover:border-indigo-300 transition-all shadow-sm group">
                <div className="flex items-start justify-between">
                   <div className="space-y-2">
                      <div className="flex items-center gap-2">
                         <StatusBadge status={ms.status} />
                         <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest text-indigo-600">MILESTONE 1</span>
                      </div>
                      <h3 className="text-[15px] font-bold text-gray-900">{ms.title}</h3>
                      <p className="text-[12px] text-gray-500 font-medium">{ms.internship.topic.title}</p>
                      
                      <div className="flex items-center gap-6 mt-4">
                         <div className="flex items-center text-[12px] text-gray-600">
                            <Users className="h-4 w-4 mr-1.5 text-gray-400" />
                            {ms.students.map(s => s.student.name).join(", ")}
                         </div>
                         <div className="flex items-center text-[12px] text-gray-600">
                            <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
                            {ms.room}
                         </div>
                      </div>
                   </div>

                   <div className="bg-gray-50 rounded-lg p-3 text-center min-w-[100px] border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{format(ms.scheduledAt, "MMM")}</p>
                      <p className="text-[20px] font-bold text-gray-900 leading-none my-1">{format(ms.scheduledAt, "dd")}</p>
                      <p className="text-[11px] font-medium text-gray-600">{format(ms.scheduledAt, "HH:mm")}</p>
                   </div>
                </div>
             </div>
           ))}
        </div>

        <div className="space-y-4">
           <div className="bg-indigo-50 border border-indigo-100 rounded-md p-5">
              <h3 className="text-[14px] font-bold text-indigo-900 mb-2 flex items-center">
                 <TrendingUp className="h-4 w-4 mr-2" />
                 Progress Analytics
              </h3>
              <p className="text-[12px] text-indigo-700 leading-relaxed">
                 85% of student groups have completed their first milestone presentation according to the 2024 academic track.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}
