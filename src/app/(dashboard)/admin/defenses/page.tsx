"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/utils/formatDate";
import { ShieldCheck, Plus, Calendar, MapPin, Users, X, Loader2, Clock } from "lucide-react";
import { Modal } from "@/components/ui/Modal";

export default function AdminDefensesPage() {
  const [defenses, setDefenses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Modal State
  const [internships, setInternships] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    internshipId: "",
    scheduledAt: "",
    timeSlot: "",
    startTime: "09:00",
    endTime: "10:30",
    room: "",
  });
  const [jury, setJury] = useState([
    { userId: "", role: "PRESIDENT", isAdvisory: false },
    { userId: "", role: "RAPPORTEUR", isAdvisory: false },
    { userId: "", role: "EXAMINATEUR", isAdvisory: false },
  ]);

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

  const fetchInitialData = async () => {
    try {
      const [intRes, teaRes] = await Promise.all([
        fetch("/api/internships"),
        fetch("/api/users?role=TEACHER")
      ]);
      
      const intData = await intRes.json();
      const teaData = await teaRes.json();
      
      // Filter internships that don't have a defense yet
      // In a real app, the API might handle this, but we'll do it here
      const scheduledIds = defenses.map((d: any) => d.internshipId);
      const availableInts = (intData.data || []).filter((i: any) => !scheduledIds.includes(i.id));
      
      setInternships(availableInts);
      setTeachers(teaData.data || []);
    } catch (error) {
      toast.error("Failed to load scheduling data");
    }
  };

  useEffect(() => {
    fetchDefenses();
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      fetchInitialData();
    }
  }, [isModalOpen]);

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.internshipId || !formData.scheduledAt || !formData.timeSlot || !formData.room) {
      toast.error("Please fill all required fields");
      return;
    }

    // Validate Jury
    const validJury = jury.filter(m => m.userId !== "");
    if (validJury.length < 2) {
      toast.error("At least 2 jury members are required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/defenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          juryMembers: validJury
        }),
      });

      if (!res.ok) throw new Error("Failed to schedule defense");

      toast.success("Defense scheduled successfully");
      setIsModalOpen(false);
      fetchDefenses();
      setFormData({ internshipId: "", scheduledAt: "", timeSlot: "", room: "" });
      setJury([
        { userId: "", role: "PRESIDENT", isAdvisory: false },
        { userId: "", role: "RAPPORTEUR", isAdvisory: false },
        { userId: "", role: "EXAMINATEUR", isAdvisory: false },
      ]);
    } catch (error) {
      toast.error("Failed to schedule defense");
    } finally {
      setIsSubmitting(false);
    }
  };

  const upcomingDefenses = defenses
    .filter((d: any) => new Date(d.scheduledAt) >= new Date())
    .sort((a: any, b: any) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());

  const completedDefenses = defenses
    .filter((d: any) => new Date(d.scheduledAt) < new Date())
    .sort((a: any, b: any) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  const renderDefenseTable = (data: any[], title: string, isCompleted: boolean = false) => (
    <div className="space-y-4">
      <h2 className={`text-[14px] font-bold border-b border-gray-100 pb-2 flex items-center ${isCompleted ? 'text-gray-500 mt-8' : 'text-gray-900'}`}>
         <div className={`h-2 w-2 rounded-full mr-2 ${isCompleted ? 'bg-gray-300' : 'bg-green-500'}`} />
         {title}
      </h2>
      <div className={`admin-table-container ${isCompleted ? 'opacity-60 grayscale-[0.3]' : ''}`}>
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
            {data.map((def: any) => (
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Defense Schedules</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage PFE defense sessions, rooms, and jury assignments.</p>
        </div>
        <Button size="md" onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Schedule Defense
        </Button>
      </div>

      {isLoading ? (
        <div className="admin-table-container py-12 text-center text-gray-400">Loading schedules...</div>
      ) : defenses.length === 0 ? (
        <div className="admin-table-container py-12 text-center text-gray-400">No defenses scheduled yet.</div>
      ) : (
        <div className="space-y-8">
          {upcomingDefenses.length > 0 && renderDefenseTable(upcomingDefenses, "Upcoming Defenses")}
          {completedDefenses.length > 0 && renderDefenseTable(completedDefenses, "Completed Defenses", true)}
        </div>
      )}

      {/* Schedule Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Schedule New Defense"
        size="lg"
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-6 font-sans">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Select Internship / Team</label>
              <select 
                className="admin-input"
                value={formData.internshipId}
                onChange={(e) => setFormData(prev => ({ ...prev, internshipId: e.target.value }))}
              >
                <option value="">-- Select Internship --</option>
                {internships.map((int: any) => (
                  <option key={int.id} value={int.id}>
                    {int.topic.title} ({int.students.map((s: any) => s.student.name).join(", ")})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center">
                <Calendar className="h-3 w-3 mr-1.5 text-gray-400" />
                Defense Date
              </label>
              <input 
                type="date"
                className="admin-input"
                value={formData.scheduledAt}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledAt: e.target.value }))}
              />
            </div>

            <div className="md:col-span-1">
              <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center">
                <Clock className="h-3 w-3 mr-1.5 text-gray-400" />
                Time Slot (Start - End)
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="time"
                  className="admin-input flex-1"
                  value={formData.startTime}
                  onChange={(e) => {
                    const newStart = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      startTime: newStart,
                      timeSlot: `${newStart} - ${prev.endTime}`
                    }));
                  }}
                />
                <span className="text-gray-400">-</span>
                <input 
                  type="time"
                  className="admin-input flex-1"
                  value={formData.endTime}
                  onChange={(e) => {
                    const newEnd = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      endTime: newEnd,
                      timeSlot: `${prev.startTime} - ${newEnd}`
                    }));
                  }}
                />
              </div>
            </div>

            <div>
              <label className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-2 block flex items-center">
                <MapPin className="h-3 w-3 mr-1.5 text-gray-400" />
                Room / Location
              </label>
              <input 
                type="text"
                className="admin-input"
                placeholder="e.g., Salle 102"
                value={formData.room}
                onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50">
            <h3 className="text-[13px] font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
              <ShieldCheck className="h-4 w-4 mr-2 text-indigo-600" />
              Jury Assignment
            </h3>
            
            <div className="space-y-4">
              {jury.map((member, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="w-1/3">
                    <span className="text-[12px] font-bold text-gray-500">{member.role}</span>
                  </div>
                  <select 
                    className="admin-input flex-1"
                    value={member.userId}
                    onChange={(e) => {
                      const newJury = [...jury];
                      newJury[index].userId = e.target.value;
                      setJury(newJury);
                    }}
                  >
                    <option value="">Select Teacher</option>
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-50">
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm"
              isLoading={isSubmitting}
            >
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
