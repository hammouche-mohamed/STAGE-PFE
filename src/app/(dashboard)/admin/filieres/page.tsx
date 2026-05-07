"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2, GraduationCap, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Filiere {
  id: string;
  name: string;
  code?: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminFilieresPage() {
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Filiere | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      setFilieres(data.data || []);
    } catch {
      toast.error("Failed to load filières");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const res = await fetch("/api/filieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), code: newCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Filière added");
      setNewName(""); setNewCode(""); setShowAdd(false);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to add filière");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/filieres/${toDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to deactivate");
      toast.success("Filière deactivated");
      setToDelete(null);
      load();
    } catch {
      toast.error("Failed to deactivate filière");
    } finally {
      setDeleting(false);
    }
  };

  const startEdit = (f: Filiere) => {
    setEditingId(f.id);
    setEditName(f.name);
    setEditCode(f.code || "");
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/filieres/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), code: editCode.trim() || null }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Filière updated");
      setEditingId(null);
      load();
    } catch {
      toast.error("Failed to update filière");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            Filières / Specialities
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">
            Manage the academic departments. Topics are assigned to filières when validated.
          </p>
        </div>
        <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Filière
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-3">
          <h3 className="text-[13px] font-semibold text-indigo-800">New Filière</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="admin-form-label">Name <span className="text-red-500">*</span></label>
              <input
                className="admin-input"
                placeholder="e.g. Computer Science"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
            </div>
            <div>
              <label className="admin-form-label">Code (optional)</label>
              <input
                className="admin-input"
                placeholder="e.g. CS"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setShowAdd(false); setNewName(""); setNewCode(""); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} isLoading={saving}>
              Save Filière
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400 text-[13px]">Loading…</div>
        ) : filieres.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-[13px]">
            No filières yet. Click "Add Filière" to create one.
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Code</th>
                <th className="px-5 py-3 text-left font-medium text-gray-500">Topics</th>
                <th className="px-5 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filieres.map((f) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3.5">
                    {editingId === f.id ? (
                      <input
                        className="admin-input py-1 text-[13px]"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                      />
                    ) : (
                      <span className="font-medium text-gray-800">{f.name}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    {editingId === f.id ? (
                      <input
                        className="admin-input py-1 text-[13px] w-24"
                        value={editCode}
                        placeholder="—"
                        onChange={(e) => setEditCode(e.target.value)}
                      />
                    ) : (
                      <span className="text-gray-500">{f.code || "—"}</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-gray-400">—</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      {editingId === f.id ? (
                        <>
                          <button
                            onClick={() => saveEdit(f.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md"
                            title="Save"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-md"
                            title="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(f)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setToDelete(f)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Deactivate"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Deactivate Filière"
        description={`Are you sure you want to deactivate "${toDelete?.name}"? Topics assigned to it will retain the assignment but this filière won't appear in new dropdowns.`}
        confirmLabel="Deactivate"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  );
}
