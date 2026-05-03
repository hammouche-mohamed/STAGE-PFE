"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText, CheckCircle, XCircle, ExternalLink, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { InternshipTypeBadge } from "@/components/ui/InternshipTypeBadge";
import { toast } from "sonner";

interface Proposal {
  id: string;
  title: string;
  internshipType: string | null;
  companyName: string | null;
  companySector: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  supportingDocUrl: string | null;
  status: string;
  createdAt: string;
  proposedBy: { name: string; email: string };
}

interface Teacher {
  id: string;
  name: string;
  teacherProfile: { currentLoad: number; maxStudents: number } | null;
}

export default function StudentProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [teacherId, setTeacherId] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [modalMode, setModalMode] = useState<"approve" | "reject" | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [propRes, teachRes] = await Promise.all([
        fetch("/api/topics?type=STUDENT_PROPOSED"),
        fetch("/api/users?role=TEACHER"),
      ]);
      const propData = await propRes.json();
      const teachData = await teachRes.json();
      setProposals(
        (propData.data || []).filter((t: Proposal) => t.status === "PENDING_ADMIN")
      );
      setTeachers(teachData.data || []);
    } catch {
      toast.error("Failed to load proposals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openModal = (proposal: Proposal, mode: "approve" | "reject") => {
    setSelected(proposal);
    setModalMode(mode);
    setTeacherId("");
    setRejectComment("");
  };

  const closeModal = () => {
    setSelected(null);
    setModalMode(null);
  };

  const handleAction = async () => {
    if (!selected || !modalMode) return;
    if (modalMode === "approve" && !teacherId) {
      toast.error("Please select a teacher");
      return;
    }
    if (modalMode === "reject" && !rejectComment.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    setActing(selected.id);
    try {
      const res = await fetch(`/api/topics/${selected.id}/proposal-action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          modalMode === "approve"
            ? { action: "APPROVE", teacherId }
            : { action: "REJECT", comment: rejectComment }
        ),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(result.message);
      closeModal();
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setActing(null);
    }
  };

  const filtered = proposals.filter((p) =>
    [p.title, p.proposedBy.name, p.companyName ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Student Proposals
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Review PATH B proposals — students who found their own host company.
          </p>
        </div>
        <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-[12px] font-semibold rounded-full">
          {proposals.length} pending
        </span>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by student, topic, or company…"
          className="admin-input pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Student</th>
              <th>Topic</th>
              <th>Company</th>
              <th>Type</th>
              <th>Submitted</th>
              <th>Doc</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-400">
                  No pending student proposals.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="admin-table-row">
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-[13px]">
                        {p.proposedBy.name}
                      </span>
                      <span className="text-[11px] text-gray-400">{p.proposedBy.email}</span>
                    </div>
                  </td>
                  <td className="max-w-[180px]">
                    <p className="text-[13px] font-medium text-gray-900 truncate">{p.title}</p>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="text-[13px] font-medium text-gray-800">
                        {p.companyName ?? "—"}
                      </span>
                      <span className="text-[11px] text-gray-400">{p.companySector ?? ""}</span>
                    </div>
                  </td>
                  <td>
                    <InternshipTypeBadge type={p.internshipType} />
                  </td>
                  <td className="text-[12px] text-gray-500">
                    {format(new Date(p.createdAt), "MMM d, yyyy")}
                  </td>
                  <td>
                    {p.supportingDocUrl ? (
                      <a
                        href={p.supportingDocUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-indigo-600 hover:text-indigo-800"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-gray-300 text-[11px]">—</span>
                    )}
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        onClick={() => openModal(p, "approve")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px]"
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openModal(p, "reject")}
                        className="text-red-600 border-red-200 hover:bg-red-50 text-[11px]"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {selected && modalMode && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-[15px] font-semibold text-gray-900">
              {modalMode === "approve" ? "Approve Proposal" : "Reject Proposal"}
            </h2>
            <p className="text-[13px] text-gray-600">
              <strong>{selected.proposedBy.name}</strong> — {selected.title}
            </p>

            {modalMode === "approve" ? (
              <div>
                <label className="admin-form-label">
                  Assign Academic Supervisor <span className="text-red-500">*</span>
                </label>
                <select
                  className="admin-input"
                  value={teacherId}
                  onChange={(e) => setTeacherId(e.target.value)}
                >
                  <option value="">Select a teacher…</option>
                  {teachers.map((t) => {
                    const load = t.teacherProfile?.currentLoad ?? 0;
                    const max = t.teacherProfile?.maxStudents ?? 5;
                    const full = load >= max;
                    return (
                      <option key={t.id} value={t.id} disabled={full}>
                        {t.name} — {load}/{max} supervisions{full ? " (FULL)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div>
                <label className="admin-form-label">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  className="admin-input h-auto py-2"
                  placeholder="Explain why this proposal is rejected…"
                  value={rejectComment}
                  onChange={(e) => setRejectComment(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                size="sm"
                isLoading={acting === selected.id}
                onClick={handleAction}
                className={
                  modalMode === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }
              >
                {modalMode === "approve" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
