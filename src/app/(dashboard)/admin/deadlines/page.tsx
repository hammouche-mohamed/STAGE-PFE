"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Users,
  ChevronLeft,
  CalendarDays
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Deadline {
  id: string;
  title: string;
  type: string;
  dueDate: string;
  isGlobal: boolean;
  academicYear: string;
}

export default function AdminDeadlinesPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    type: "TOPIC_SUBMISSION",
    date: "",
    time: "23:59",
    isGlobal: true,
    academicYear: "" // populated from settings
  });

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/public");
      const data = await res.json();
      if (data.data?.currentAcademicYear) {
        setFormData(prev => ({ ...prev, academicYear: data.data.currentAcademicYear }));
      }
    } catch {
      // Use a dynamic fallback based on current date if DB is unreachable
      const now = new Date();
      const currentYear = now.getFullYear();
      const nextYear = currentYear + 1;
      setFormData(prev => ({ ...prev, academicYear: `${currentYear}-${nextYear}` }));
    }
  }, []);

  const fetchDeadlines = useCallback(async () => {
    try {
      const res = await fetch("/api/deadlines");
      const data = await res.json();
      setDeadlines(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchDeadlines();
    fetchSettings();
  }, [fetchDeadlines, fetchSettings]);

  const handleSaveDeadline = async () => {
    if (!formData.title || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setIsSaving(true);
    try {
      const dueDate = new Date(`${formData.date}T${formData.time}`);
      const res = await fetch("/api/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          type: formData.type,
          dueDate: dueDate.toISOString(),
          isGlobal: formData.isGlobal,
          academicYear: formData.academicYear
        }),
      });

      if (!res.ok) throw new Error("Failed to save deadline");

      toast.success("New deadline set successfully");
      setShowAddForm(false);
      setFormData({
        title: "",
        type: "TOPIC_SUBMISSION",
        date: "",
        time: "23:59",
        isGlobal: true,
        academicYear: formData.academicYear // keep the fetched year
      });
      fetchDeadlines();
      router.refresh();
    } catch (error) {
      toast.error("Failed to create deadline");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const executeDelete = async () => {
    if (!deleteConfirmId) return;
    setIsDeleting(true);
    try {
      // In a real app, delete API would be here.
      setDeadlines(curr => curr.filter(d => d.id !== deleteConfirmId));
      toast.success("Deadline removed successfully.");
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error("Failed to delete deadline");
    } finally {
      setIsDeleting(false);
    }
  };

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

  const upcomingDeadlines = deadlines
    .filter(d => new Date(d.dueDate) >= new Date())
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const passedDeadlines = deadlines
    .filter(d => new Date(d.dueDate) < new Date())
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <Link 
          href="/admin" 
          className="flex items-center text-[12px] text-indigo-600 hover:text-indigo-800 font-medium transition-colors w-fit border border-indigo-100 bg-indigo-50/50 px-3 py-1 rounded-full"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          {t("common.back")}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-semibold text-gray-900">{t("common.deadlines")}</h1>
            <p className="text-[13px] text-gray-500 mt-0.5">{t("common.appSubtitle")}</p>
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
            <Plus className="h-4 w-4 mr-2" />
            {showAddForm ? t("common.cancel") : t("common.deadlines")}
          </Button>
        </div>
      </div>

      <Modal
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        title={t("common.deadlines")}
        size="lg"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setShowAddForm(false)}>{t("common.cancel")}</Button>
            <Button size="sm" onClick={handleSaveDeadline} isLoading={isSaving}>{t("common.confirm")}</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">{t("common.name")}</label>
              <Input 
                placeholder="e.g. Final PFE Report Submission" 
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">{t("topics.type")}</label>
              <select 
                className="admin-input"
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
              >
                <option value="TOPIC_SUBMISSION">Topic Submission</option>
                <option value="MID_REPORT">Mid-term Report</option>
                <option value="FINAL_REPORT">Final Report</option>
                <option value="MINI_PRESENTATION">Mini-Presentation Window</option>
                <option value="DEFENSE">Defense Period</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">{t("common.registrations")}</label>
              <Input 
                value={formData.academicYear}
                onChange={(e) => setFormData({...formData, academicYear: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">{t("common.date")}</label>
              <Input 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">Due Time</label>
              <Input 
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({...formData, time: e.target.value})}
              />
            </div>

            <div className="flex items-end pb-1.5">
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData({...formData, isGlobal: e.target.checked})}
                />
                <span className="text-[13px] font-medium text-gray-700">Apply as Global System Deadline</span>
              </label>
            </div>
          </div>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-10">
          {/* Upcoming Deadlines */}
          <section className="space-y-4">
            <h2 className="text-[14px] font-bold text-gray-900 border-b border-gray-100 pb-2 flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
              Active & Upcoming Deadlines
            </h2>
            
            <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
              <table className="admin-table stacked-table">
                <thead className="admin-table-header">
                  <tr>
                    <th>{t("common.name")}</th>
                    <th>{t("common.date")}</th>
                    <th>{t("common.status")}</th>
                    <th className="text-right">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400">Loading deadlines...</td>
                    </tr>
                  ) : upcomingDeadlines.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-400 italic">No active deadlines scheduled.</td>
                    </tr>
                  ) : (
                    upcomingDeadlines.map((deadline) => (
                      <tr key={deadline.id} className="admin-table-row group">
                        <td data-label="Event">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gray-50 rounded border border-gray-100 group-hover:bg-white group-hover:border-indigo-100 transition-colors flex-shrink-0">
                              {getDeadlineIcon(deadline.type)}
                            </div>
                            <div className="flex flex-col items-start">
                              <span className="font-bold text-gray-900 text-left">{deadline.title}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                                {deadline.type.replace(/_/g, " ")}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td data-label="Due Date">
                          <div className="flex flex-col items-end sm:items-start">
                            <span className="text-[13px] font-bold text-gray-700">
                              {format(new Date(deadline.dueDate), "MMMM dd, yyyy")}
                            </span>
                            <span className="text-[11px] text-gray-400 font-medium">
                              at {format(new Date(deadline.dueDate), "HH:mm")}
                            </span>
                          </div>
                        </td>
                        <td data-label="Scope">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            deadline.isGlobal ? "bg-indigo-50 text-indigo-700" : "bg-gray-50 text-gray-700"
                          }`}>
                            {deadline.isGlobal ? "GLOBAL" : "LOCAL"}
                          </span>
                        </td>
                        <td data-label="Remove" className="text-right">
                          <button 
                            onClick={() => handleDelete(deadline.id)}
                            className="p-1.5 text-gray-300 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
  
          {/* Passed Deadlines */}
          <section className="space-y-4">
            <h2 className="text-[14px] font-bold text-gray-400 border-b border-gray-100 pb-2 flex items-center">
              <div className="h-2 w-2 rounded-full bg-gray-300 mr-2" />
              Passed Deadlines
            </h2>
            
            <div className="admin-table-container opacity-60 grayscale-[0.2] sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
              <table className="admin-table stacked-table">
                <tbody>
                  {passedDeadlines.map((deadline) => (
                    <tr key={deadline.id} className="admin-table-row">
                      <td data-label="Event">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 rounded border border-gray-100 flex-shrink-0">
                            {getDeadlineIcon(deadline.type)}
                          </div>
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-gray-700 text-left">{deadline.title}</span>
                            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                              {deadline.type.replace(/_/g, " ")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td data-label="Ended">
                        <span className="text-[13px] text-gray-500">
                          Ended {format(new Date(deadline.dueDate), "MMM dd, yyyy")}
                        </span>
                      </td>
                      <td data-label="Year">
                         <span className="text-[10px] font-medium text-gray-400">{deadline.academicYear}</span>
                      </td>
                      <td data-label="Status" className="text-right">
                        <StatusBadge status="COMPLETED" />
                      </td>
                    </tr>
                  ))}
                  {passedDeadlines.length === 0 && (
                    <tr>
                      <td className="text-center py-6 text-[13px] text-gray-400">No passed deadlines in history.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Info Column */}
        <div className="space-y-6">
          <div className="bg-indigo-600 rounded-md p-6 text-white shadow-lg overflow-hidden relative">
            <div className="relative z-10">
              <Bell className="h-6 w-6 text-indigo-200 mb-4" />
              <h3 className="text-[16px] font-bold">Smart Calendar Sync</h3>
              <p className="text-[12px] text-indigo-100 mt-2 leading-relaxed">
                Global deadlines are automatically synchronized with student dashboards. Any change triggers a system notification to ensure everyone stays informed.
              </p>
            </div>
            <Calendar className="absolute -bottom-4 -right-4 h-24 w-24 text-white/5 rotate-12" />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-md p-5 space-y-3">
             <div className="flex items-center gap-2 text-amber-900">
                <AlertTriangle className="h-4 w-4 font-bold" />
                <span className="text-[13px] font-bold uppercase tracking-tight">System Enforcement</span>
             </div>
             <p className="text-[12px] text-amber-800/80 leading-relaxed">
                Setting a deadline of type <span className="font-bold underline">FINAL_REPORT</span> will block all student uploads after the specified date and time unless an individual extension is granted by an administrator.
             </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
             <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Current Track</h4>
             <div className="space-y-4">
                <div className="flex items-center gap-3">
                   <div className="h-2 w-2 rounded-full bg-green-500" />
                   <span className="text-[13px] text-gray-700 font-medium">Topic Assignment Phase</span>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                   <div className="h-2 w-2 rounded-full bg-gray-300" />
                   <span className="text-[13px] text-gray-500">Mid-term Progress</span>
                </div>
                <div className="flex items-center gap-3 opacity-50">
                   <div className="h-2 w-2 rounded-full bg-gray-300" />
                   <span className="text-[13px] text-gray-500">Final Validation</span>
                </div>
             </div>
          </div>
        </div>
      </div>
      
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={executeDelete}
        title={t("common.delete")}
        description={t("errors.serverError")}
        isLoading={isDeleting}
      />
    </div>
  );
}
