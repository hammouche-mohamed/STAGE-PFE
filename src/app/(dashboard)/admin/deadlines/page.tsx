"use client";

import React, { useEffect, useState } from "react";
import { 
  Calendar, 
  Clock, 
  Plus, 
  Bell, 
  Trash2, 
  AlertTriangle,
  FileText,
  ShieldCheck,
  Building2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Deadline {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  isGlobal: boolean;
  academicYear: string;
}

export default function AdminDeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDeadlines = async () => {
    try {
      const res = await fetch("/api/deadlines");
      const data = await res.json();
      setDeadlines(data.data || []);
    } catch (error) {
      toast.error("Failed to load deadlines");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDeadlines();
  }, []);

  const getDeadlineIcon = (type: string) => {
    switch (type) {
      case "TOPIC_SUBMISSION": return <FileText className="h-4 w-4 text-indigo-500" />;
      case "MID_REPORT": return <Clock className="h-4 w-4 text-amber-500" />;
      case "FINAL_REPORT": return <ShieldCheck className="h-4 w-4 text-green-500" />;
      case "MINI_PRESENTATION": return <Users className="h-4 w-4 text-purple-500" />;
      case "DEFENSE": return <Building2 className="h-4 w-4 text-red-500" />;
      default: return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Academic Deadlines</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Define system-wide dates for report submissions and defenses.</p>
        </div>
        <Button size="sm" className="h-[36px]">
          <Plus className="h-4 w-4 mr-2" />
          Set New Deadline
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deadlines List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="admin-table-container">
            <table className="admin-table">
              <thead className="admin-table-header">
                <tr>
                  <th>Event & Type</th>
                  <th>Due Date</th>
                  <th>Scope</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">Loading deadlines...</td>
                  </tr>
                ) : deadlines.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-gray-400">No deadlines have been set yet.</td>
                  </tr>
                ) : (
                  deadlines.map((deadline) => (
                    <tr key={deadline.id} className="admin-table-row">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 rounded border border-gray-100">
                            {getDeadlineIcon(deadline.type)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{deadline.title}</span>
                            <span className="text-[11px] text-gray-400 uppercase tracking-tighter">
                              {deadline.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-[13px] font-medium text-gray-700">
                            {format(new Date(deadline.dueDate), "MMM d, yyyy")}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {format(new Date(deadline.dueDate), "HH:mm")}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${
                          deadline.isGlobal ? "bg-purple-50 text-purple-700" : "bg-gray-50 text-gray-700"
                        }`}>
                          {deadline.isGlobal ? "GLOBAL" : "LOCAL"}
                        </span>
                      </td>
                      <td className="text-right">
                        <button className="p-1.5 text-gray-400 hover:text-red-600 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Status / Alerts */}
        <div className="space-y-4">
          <div className="bg-indigo-600 rounded-md p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <Bell className="h-6 w-6 text-indigo-200 mb-4" />
              <h3 className="text-[16px] font-bold">Smart Reminders</h3>
              <p className="text-[12px] text-indigo-100 mt-2 leading-relaxed">
                When you set a global deadline, the system automatically notifies all relevant students and teachers via email and platform alerts.
              </p>
            </div>
            {/* Decal background */}
            <Calendar className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm space-y-4">
             <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                <div>
                   <p className="text-[13px] font-semibold text-gray-900">Automation Note</p>
                   <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">
                      Missing a final report deadline will automatically mark the internship as "LATE" in the tracking dashboard.
                   </p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
