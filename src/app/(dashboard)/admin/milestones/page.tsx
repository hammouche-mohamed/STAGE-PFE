"use client";

import React, { useState } from "react";
import {
  MapPin,
  Users,
  Plus,
  TrendingUp,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminMilestonesPage() {
  // ... (existing state)
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

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [newMilestone, setNewMilestone] = useState({
    title: "",
    topic: "",
    students: "",
    room: "",
    date: "",
    time: "",
  });

  const [milestoneToDelete, setMilestoneToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setEditingMilestoneId(null);
    setNewMilestone({ title: "", topic: "", students: "", room: "", date: "", time: "" });
  };

  const handleSaveMilestone = () => {
    if (!newMilestone.title || !newMilestone.topic || !newMilestone.students || !newMilestone.room || !newMilestone.date || !newMilestone.time) {
      toast.error("Please fill in all fields to schedule the session.");
      return;
    }

    const scheduledAt = parseISO(`${newMilestone.date}T${newMilestone.time}`);
    const milestonePayload = {
      id: editingMilestoneId ?? Date.now().toString(),
      title: newMilestone.title,
      internship: { topic: { title: newMilestone.topic } },
      students: newMilestone.students.split(",").map((name) => ({ student: { name: name.trim() } })),
      scheduledAt,
      room: newMilestone.room,
      status: "SCHEDULED",
    };

    setMilestones((current) => {
      if (editingMilestoneId) {
        return current.map((ms) => (ms.id === editingMilestoneId ? milestonePayload : ms));
      }
      return [milestonePayload, ...current];
    });

    setShowScheduleForm(false);
    resetForm();
    toast.success(editingMilestoneId ? "Milestone session updated." : "Milestone session scheduled successfully.");
  };

  const handleCancel = () => {
    setShowScheduleForm(false);
    resetForm();
  };

  const handleEditMilestone = (milestone: any) => {
    setEditingMilestoneId(milestone.id);
    setNewMilestone({
      title: milestone.title,
      topic: milestone.internship.topic.title,
      students: milestone.students.map((s: any) => s.student.name).join(", "),
      room: milestone.room,
      date: format(milestone.scheduledAt, "yyyy-MM-dd"),
      time: format(milestone.scheduledAt, "HH:mm"),
    });
    setShowScheduleForm(true);
  };

  const handleDeleteMilestone = (id: string) => {
    setMilestoneToDelete(id);
  };

  const confirmDeleteMilestone = () => {
    if (!milestoneToDelete) return;
    setIsDeleting(true);
    // Simulate API delay
    setTimeout(() => {
      setMilestones((current) => current.filter((ms) => ms.id !== milestoneToDelete));
      setMilestoneToDelete(null);
      setIsDeleting(false);
      toast.success("Milestone session deleted.");
    }, 500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Milestones Management</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Schedule and monitor mini-presentations for all student groups.</p>
        </div>
        <div>
          <Button size="sm" onClick={() => { resetForm(); setShowScheduleForm(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Session
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showScheduleForm}
        onClose={handleCancel}
        title={editingMilestoneId ? "Edit Milestone Session" : "New Milestone Session"}
        footer={
          <>
            <Button size="sm" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveMilestone}>
              {editingMilestoneId ? "Update session" : "Save session"}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          <Input
            label="Session title"
            value={newMilestone.title}
            onChange={(event) => setNewMilestone((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="e.g. Mini-Presentation 1"
          />
          <Input
            label="Topic title"
            value={newMilestone.topic}
            onChange={(event) => setNewMilestone((prev) => ({ ...prev, topic: event.target.value }))}
            placeholder="e.g. AI-powered Medical Diagnosis"
          />
          <Input
            label="Students"
            value={newMilestone.students}
            onChange={(event) => setNewMilestone((prev) => ({ ...prev, students: event.target.value }))}
            placeholder="Separate names with commas"
          />
          <Input
            label="Room"
            value={newMilestone.room}
            onChange={(event) => setNewMilestone((prev) => ({ ...prev, room: event.target.value }))}
            placeholder="e.g. Room 101B"
          />
          <Input
            label="Date"
            type="date"
            value={newMilestone.date}
            onChange={(event) => setNewMilestone((prev) => ({ ...prev, date: event.target.value }))}
          />
          <Input
            label="Time"
            type="time"
            value={newMilestone.time}
            onChange={(event) => setNewMilestone((prev) => ({ ...prev, time: event.target.value }))}
          />
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
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
                                 {ms.students.map((s: any) => s.student.name).join(", ")}
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
                     <div className="mt-4 flex flex-wrap gap-2">
                       <Button size="sm" variant="outline" onClick={() => handleEditMilestone(ms)}>
                         Edit
                       </Button>
                       <Button size="sm" variant="danger" onClick={() => handleDeleteMilestone(ms.id)}>
                         Delete
                       </Button>
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
                  <div key={ms.id} className="bg-white border border-gray-200 rounded-md p-5 opacity-60 hover:opacity-100 transition-all shadow-sm grayscale-[0.5] hover:grayscale-0">
                     <div className="flex items-start justify-between">
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                              <div className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded">Passed</div>
                              <span className="text-[11px] font-bold text-gray-300 uppercase tracking-widest text-indigo-300">MILESTONE 1</span>
                           </div>
                           <h3 className="text-[15px] font-bold text-gray-600">{ms.title}</h3>
                           <p className="text-[12px] text-gray-400 font-medium">{ms.internship.topic.title}</p>
                           
                           <div className="flex items-center gap-6 mt-4">
                              <div className="flex items-center text-[12px] text-gray-400">
                                 <Users className="h-4 w-4 mr-1.5 text-gray-300" />
                                 {ms.students.map((s: any) => s.student.name).join(", ")}
                              </div>
                              <div className="flex items-center text-[12px] text-gray-400">
                                 <MapPin className="h-4 w-4 mr-1.5 text-gray-300" />
                                 {ms.room}
                              </div>
                           </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 text-center min-w-[100px] border border-gray-100 opacity-50">
                           <p className="text-[10px] font-bold text-gray-400 uppercase">{format(ms.scheduledAt, "MMM")}</p>
                           <p className="text-[20px] font-bold text-gray-900 leading-none my-1">{format(ms.scheduledAt, "dd")}</p>
                           <p className="text-[11px] font-medium text-gray-600">{format(ms.scheduledAt, "HH:mm")}</p>
                        </div>
                     </div>
                  </div>
                ))}
           </div>
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
      <ConfirmDialog
        isOpen={!!milestoneToDelete}
        onClose={() => setMilestoneToDelete(null)}
        onConfirm={confirmDeleteMilestone}
        title="Delete Milestone Session"
        description="Are you sure you want to delete this session? This action cannot be undone and students will no longer see this scheduled event."
        isLoading={isDeleting}
      />
    </div>
  );
}
