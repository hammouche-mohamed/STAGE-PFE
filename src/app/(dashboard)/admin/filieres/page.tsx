"use client";

import React, { useEffect, useState } from "react";
import { Building2, Plus, Trash2, CheckCircle2, XCircle, Search } from "lucide-react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

interface Filiere {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminFilieresPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  const [filieres, setFilieres] = useState<Filiere[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFiliere, setNewFiliere] = useState({ name: "", code: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filiereToDelete, setFiliereToDelete] = useState<Filiere | null>(null);

  const fetchFilieres = async () => {
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      setFilieres(data.data || []);
    } catch (error) {
      toast.error("Failed to load departments");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilieres();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFiliere.name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/filieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFiliere),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create department");

      toast.success("Department added successfully");
      setIsAddModalOpen(false);
      setNewFiliere({ name: "", code: "" });
      fetchFilieres();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!filiereToDelete) return;
    try {
      const res = await fetch(`/api/filieres/${filiereToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete department");
      }

      toast.success("Department deleted successfully");
      setFiliereToDelete(null);
      fetchFilieres();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const filteredFilieres = filieres.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    (f.code && f.code.toLowerCase().includes(search.toLowerCase()))
  );

  // Security Guard: Only Super Admins should manage filieres
  if (session && !session.user.isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center p-6">
        <XCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-[18px] font-semibold text-gray-900">Access Restricted</h2>
        <p className="text-[14px] text-gray-500 max-w-md mt-2">
          Only Administrators can manage system-wide departments. Please contact the main administrator if you need changes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">Departments Management</h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">Add and manage the academic departments (Filières).</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          Add Department
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm">
        <div className="p-4 border-b border-gray-200">
          <div className="relative max-w-md">
            <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
            <input
              type="text"
              placeholder="Search departments..."
              className={`admin-input ${isRTL ? "pr-10" : "pl-10"}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table stacked-table">
            <thead className="admin-table-header">
              <tr className={isRTL ? "text-right" : "text-left"}>
                <th className="py-3 px-4">Department Name</th>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">Loading...</td>
                </tr>
              ) : filteredFilieres.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">No departments found.</td>
                </tr>
              ) : (
                filteredFilieres.map((f) => (
                  <tr key={f.id} className="admin-table-row">
                    <td data-label="Name" className="py-3 px-4 font-medium text-gray-900 dark:text-white">{f.name}</td>
                    <td data-label="Code" className="py-3 px-4 text-gray-500 dark:text-gray-400 font-mono text-[12px]">{f.code || "---"}</td>
                    <td data-label="Status" className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-[12px] font-medium">Active</span>
                      </div>
                    </td>
                    <td data-label="Actions" className="py-3 px-4 text-right">
                      <button 
                        onClick={() => setFiliereToDelete(f)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Department"
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
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-100 dark:border-slate-800">
            <div className="p-5 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white">Add New Department</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                <Plus className="h-5 w-5 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-gray-700">Department Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Informatique"
                  className="admin-input w-full"
                  value={newFiliere.name}
                  onChange={(e) => setNewFiliere({ ...newFiliere, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-gray-700">Short Code (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. INFO"
                  className="admin-input w-full font-mono"
                  value={newFiliere.code}
                  onChange={(e) => setNewFiliere({ ...newFiliere, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button type="submit" isLoading={isSubmitting}>
                  Create Department
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!filiereToDelete}
        onClose={() => setFiliereToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Department"
        description={`Are you sure you want to delete "${filiereToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
