"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils/formatDate";
import { ShieldCheck, Plus, Calendar, MapPin, Users } from "lucide-react";

export default function AdminDefensesPage() {
  const [defenses, setDefenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDefenses = async () => {
    try {
      const res = await fetch("/api/defenses");
      const data = await res.json();
      setDefenses(data.data || []);
    } catch (error) {
      toast.error("Failed to load defenses");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDefenses();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Defense Schedules</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage PFE defense sessions, rooms, and jury assignments.</p>
        </div>
        <Button size="md">
          <Plus className="h-4 w-4 mr-2" />
          Schedule Defense
        </Button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Internship / Topic</th>
              <th>Student(s)</th>
              <th>Schedule</th>
              <th>Location</th>
              <th>Jury</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : defenses.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-gray-400">No defenses scheduled yet.</td></tr>
            ) : (
              defenses.map((def: any) => (
                <tr key={def.id} className="admin-table-row">
                  <td className="max-w-[200px] truncate font-medium text-gray-900">
                    {def.internship.topic.title}
                  </td>
                  <td>
                    <div className="text-[12px]">
                      {def.internship.students.map((s: any) => s.student.name).join(" & ")}
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium">{formatDateTime(def.scheduledAt).split(" ")[0]}</span>
                      <span className="text-[11px] text-gray-400 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {def.timeSlot}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center text-[13px] text-gray-600">
                      <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                      {def.room}
                    </div>
                  </td>
                  <td>
                    <div className="group relative cursor-help">
                      <div className="flex items-center text-[12px] text-indigo-600 font-medium">
                        <Users className="h-3 w-3 mr-1" />
                        {def.juryMembers.length} Members
                      </div>
                      <div className="absolute left-0 bottom-full mb-2 w-48 bg-white border border-gray-200 rounded shadow-lg p-2 z-50 opacity-0 group-hover:opacity-100 transition pointer-events-none">
                        {def.juryMembers.map((m: any) => (
                          <div key={m.id} className="text-[11px] py-0.5 border-b border-gray-50 last:border-0">
                            <span className="font-semibold">{m.role}:</span> {m.user.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={def.status} />
                  </td>
                  <td className="text-right">
                    <button className="text-indigo-600 hover:text-indigo-700 text-[12px] font-medium">
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
