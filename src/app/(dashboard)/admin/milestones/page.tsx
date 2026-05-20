"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  MapPin,
  Users,
  Plus,
  TrendingUp,
  CalendarClock,
  Layers,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSession } from "next-auth/react";

import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface InternshipOption {
  id: string;
  topic: {
    title: string;
    internshipType?: string | null;
    filiere?: { id: string; name: string } | null;
  };
  internshipType?: string | null;
  internshipstudent?: { user: { name: string } }[];
  user?: { name: string };
}

interface Filiere {
  id: string;
  name: string;
}

interface MiniPresentation {
  id: string;
  internshipId: string;
  title: string;
  scheduledAt: string;
  room: string;
  timeSlot: string;
  documentDeadline: string;
  status: string;
  adminComment?: string | null;
  internship: {
    id: string;
    teacherId: string;
    topic: { title: string };
    internshipstudent: { user: { id: string; name: string } }[];
  };
}

const emptyForm = {
  title: "",
  date: "",
  time: "",
  room: "",
  timeSlot: "",
  documentDeadline: "",
  filiereId: "" as string, // super admin only — dept admin's filière is implicit
};

export default function AdminMilestonesPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const isSuperAdmin = !!session?.user?.isSuperAdmin;

  const [sessions, setSessions] = useState<MiniPresentation[]>([]);
  const [internships, setInternships] = useState<InternshipOption[]>([]);
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/mini-presentations");
      const data = await res.json();
      if (res.ok) setSessions(data.data || []);
    } catch {
      toast.error("Failed to load mini-presentations");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchInternships = useCallback(async () => {
    try {
      // Used only to show "this will be scheduled for N PFE internships" in
      // the form. The actual fan-out happens server-side by filière scope.
      const res = await fetch("/api/internships?internshipType=PFE&limit=200");
      const data = await res.json();
      if (res.ok) setInternships(data.data || []);
    } catch {
      // non-fatal — the form will just show "0 PFE internships found"
    }
  }, []);

  const fetchFilieres = useCallback(async () => {
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      if (res.ok) setFilieres(data.data || []);
    } catch {
      // non-fatal — super admin will see an empty selector
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchInternships();
    if (isSuperAdmin) fetchFilieres();
  }, [fetchSessions, fetchInternships, fetchFilieres, isSuperAdmin]);

  // Count active PFE internships the next milestone will fan out to. For
  // dept admin: their own filière. For super admin: the picked filière, or
  // all if none picked.
  const targetCount = useMemo(() => {
    if (editingId) return 0; // edit mode is per-row, no fan-out
    const cancelledStatuses = new Set(["CANCELLED", "COMPLETED"]);
    return internships.filter((i: any) => {
      if (cancelledStatuses.has(i.status)) return false;
      if (isSuperAdmin) {
        if (!form.filiereId) return true; // all filières
        return i.topic?.filiere?.id === form.filiereId;
      }
      // dept admin's filière scope is enforced server-side; the client
      // already only gets internships in their filière for non-super
      return true;
    }).length;
  }, [internships, isSuperAdmin, form.filiereId, editingId]);

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (session: MiniPresentation) => {
    const dt = new Date(session.scheduledAt);
    setEditingId(session.id);
    setForm({
      title: session.title,
      date: format(dt, "yyyy-MM-dd"),
      time: format(dt, "HH:mm"),
      room: session.room,
      timeSlot: session.timeSlot,
      documentDeadline: format(new Date(session.documentDeadline), "yyyy-MM-dd"),
      filiereId: "",
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.title || !form.date || !form.time || !form.room || !form.timeSlot || !form.documentDeadline) {
      toast.error("Please fill in every field.");
      return;
    }

    const scheduledAt = new Date(`${form.date}T${form.time}`).toISOString();
    const documentDeadline = new Date(`${form.documentDeadline}T23:59`).toISOString();

    setIsSaving(true);
    try {
      if (editingId) {
        // Edit mode stays per-row (PATCH a single MiniPresentation).
        const res = await fetch(`/api/mini-presentations/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            scheduledAt,
            room: form.room,
            timeSlot: form.timeSlot,
            documentDeadline,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");
        toast.success("Session updated");
      } else {
        // Create mode fans out across every active PFE internship in scope.
        const res = await fetch("/api/mini-presentations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.title,
            scheduledAt,
            room: form.room,
            timeSlot: form.timeSlot,
            documentDeadline,
            filiereId: isSuperAdmin && form.filiereId ? form.filiereId : null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to save");
        const { created, skipped } = data.data || { created: 0, skipped: 0 };
        toast.success(
          skipped > 0
            ? `Scheduled for ${created} PFE internship${created === 1 ? "" : "s"} (${skipped} skipped — same title already exists).`
            : `Scheduled for ${created} PFE internship${created === 1 ? "" : "s"}.`,
        );
      }
      setShowForm(false);
      resetForm();
      fetchSessions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/mini-presentations/${pendingDeleteId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      toast.success("Session deleted");
      setPendingDeleteId(null);
      fetchSessions();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  const upcoming = sessions
    .filter((s) => new Date(s.scheduledAt) >= new Date() && s.status !== "CANCELLED")
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const passed = sessions
    .filter((s) => new Date(s.scheduledAt) < new Date() || s.status === "CANCELLED")
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("common.milestones")}</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Schedule and manage mini-presentation sessions for active internships.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t("common.scheduleSession")}
        </Button>
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editingId ? "Edit mini-presentation" : "Schedule mini-presentation"}
        footer={
          <>
            <Button size="sm" variant="outline" onClick={() => { setShowForm(false); resetForm(); }} disabled={isSaving}>
              {t("common.cancel")}
            </Button>
            <Button size="sm" onClick={handleSubmit} isLoading={isSaving}>
              {editingId ? "Update session" : "Save session"}
            </Button>
          </>
        }
      >
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bulk scope. Dept admin's filière is implicit (server enforces it).
              Super admin gets a selector — empty = every filière at once. */}
          {!editingId && (
            <div className="md:col-span-2 space-y-3">
              {isSuperAdmin && (
                <div>
                  <label className="text-[12px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide block mb-1.5">
                    Filière
                  </label>
                  <select
                    className="admin-input w-full"
                    value={form.filiereId}
                    onChange={(e) => setForm((p) => ({ ...p, filiereId: e.target.value }))}
                  >
                    <option value="">— All filières —</option>
                    {filieres.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-start gap-2 rounded-md border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2.5">
                <Layers className="h-4 w-4 mt-0.5 text-indigo-500 shrink-0" />
                <p className="text-[12px] text-indigo-800 dark:text-indigo-300 leading-relaxed">
                  This milestone will be scheduled for <strong>{targetCount}</strong> active PFE internship{targetCount === 1 ? "" : "s"}
                  {isSuperAdmin && form.filiereId
                    ? ` in ${filieres.find((f) => f.id === form.filiereId)?.name ?? "the selected filière"}`
                    : isSuperAdmin
                      ? " across every filière"
                      : ""}
                  . Each student team gets the same date, room and deadline.
                </p>
              </div>
            </div>
          )}
          {editingId && (
            <div className="md:col-span-2 flex items-start gap-2 rounded-md border border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/40 px-3 py-2.5">
              <Layers className="h-4 w-4 mt-0.5 text-gray-400 shrink-0" />
              <p className="text-[12px] text-gray-600 dark:text-gray-300 leading-relaxed">
                Editing this milestone only affects this one team. To change every team's date, edit each row or re-create the milestone.
              </p>
            </div>
          )}
          <Input
            label="Session title"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            placeholder="e.g. Mini-Presentation 1"
          />
          <Input
            label="Time slot label"
            value={form.timeSlot}
            onChange={(e) => setForm((p) => ({ ...p, timeSlot: e.target.value }))}
            placeholder="e.g. 10:00 – 10:30"
          />
          <Input
            label="Date"
            type="date"
            value={form.date}
            onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          />
          <Input
            label="Time"
            type="time"
            value={form.time}
            onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
          />
          <Input
            label="Room"
            value={form.room}
            onChange={(e) => setForm((p) => ({ ...p, room: e.target.value }))}
            placeholder="e.g. Room 101B"
          />
          <Input
            label="Document submission deadline"
            type="date"
            value={form.documentDeadline}
            onChange={(e) => setForm((p) => ({ ...p, documentDeadline: e.target.value }))}
          />
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-8">
          {/* Upcoming */}
          <section className="space-y-4">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center">
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
              Upcoming sessions
            </h2>
            {isLoading ? (
              <p className="text-[12px] text-gray-400 italic">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="text-[12px] text-gray-400 italic">No upcoming mini-presentations scheduled.</p>
            ) : (
              upcoming.map((s) => <SessionCard key={s.id} session={s} onEdit={openEdit} onDelete={(id) => setPendingDeleteId(id)} />)
            )}
          </section>

          {/* Passed */}
          <section className="space-y-4">
            <h2 className="text-[14px] font-bold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800 pb-2 flex items-center mt-8">
              <div className="h-2 w-2 rounded-full bg-gray-300 mr-2" />
              Past sessions
            </h2>
            {passed.length === 0 ? (
              <p className="text-[12px] text-gray-400 italic">No past mini-presentations yet.</p>
            ) : (
              passed.map((s) => <SessionCard key={s.id} session={s} faded onEdit={openEdit} onDelete={(id) => setPendingDeleteId(id)} />)
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/40 rounded-md p-5">
            <h3 className="text-[14px] font-bold text-indigo-900 dark:text-indigo-300 mb-2 flex items-center">
              <TrendingUp className="h-4 w-4 mr-2" />
              At a glance
            </h3>
            <p className="text-[12px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
              {sessions.length} session{sessions.length === 1 ? "" : "s"} total —{" "}
              {upcoming.length} upcoming, {passed.length} past.
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        isOpen={!!pendingDeleteId}
        onClose={() => setPendingDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete mini-presentation"
        description="This will remove the session and notify the affected supervisor and students. Continue?"
        isLoading={isDeleting}
      />
    </div>
  );
}

function SessionCard({
  session,
  faded,
  onEdit,
  onDelete,
}: {
  session: MiniPresentation;
  faded?: boolean;
  onEdit: (s: MiniPresentation) => void;
  onDelete: (id: string) => void;
}) {
  const dt = new Date(session.scheduledAt);
  const studentList = session.internship.internshipstudent.map((s) => s.user.name).join(", ") || "—";
  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-5 shadow-sm ${
        faded ? "opacity-70" : "hover:border-indigo-300 transition-all group"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={session.status} />
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest">
              {session.timeSlot}
            </span>
          </div>
          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">{session.title}</h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
            {session.internship.topic.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
            <span className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
              <Users className="h-4 w-4 mr-1.5 text-gray-400" />
              {studentList}
            </span>
            <span className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
              <MapPin className="h-4 w-4 mr-1.5 text-gray-400" />
              {session.room}
            </span>
            <span className="flex items-center text-[12px] text-gray-600 dark:text-gray-300">
              <CalendarClock className="h-4 w-4 mr-1.5 text-gray-400" />
              Doc deadline {format(new Date(session.documentDeadline), "PP")}
            </span>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3 text-center min-w-[100px] border border-gray-100 dark:border-slate-700">
          <p className="text-[10px] font-bold text-gray-400 uppercase">{format(dt, "MMM")}</p>
          <p className="text-[20px] font-bold text-gray-900 dark:text-white leading-none my-1">{format(dt, "dd")}</p>
          <p className="text-[11px] font-medium text-gray-600 dark:text-gray-300">{format(dt, "HH:mm")}</p>
        </div>
      </div>
      {!faded && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => onEdit(session)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => onDelete(session.id)}>Delete</Button>
        </div>
      )}
    </div>
  );
}
