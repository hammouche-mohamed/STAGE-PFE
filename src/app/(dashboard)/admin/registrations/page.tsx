"use client";

import React, { useEffect, useState, useCallback } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Eye, Search, Trash2, X, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";
import { Modal } from "@/components/ui/Modal";

interface RegistrationRequest {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  motivation?: string;
  companyName?: string;
  studentId?: string;
  promotion?: string;
  speciality?: string;
  academicYear?: string;
  grade?: string;
  level?: string;
  sector?: string;
  wilaya?: string;
  adminComment?: string;
}

export default function AdminRegistrationsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  
  // Protect route for super admins only
  if (session && !session.user.isSuperAdmin) {
    return (
      <div className="p-8 text-center text-gray-500 dark:text-gray-400 mt-20">
        You do not have permission to view this page. This area is restricted to Super Administrators.
      </div>
    );
  }

  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<string[]>([]);
  const [currentYear, setCurrentYear] = useState("");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [blockEmail, setBlockEmail] = useState(false);
  const [filterStatus, setFilterStatus] = useState("PENDING");

  const fetchRequests = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (filterStatus !== "ALL") params.append("status", filterStatus);
      
      const res = await fetch(`/api/registrations?${params.toString()}`);
      const data = await res.json();
      setRequests(data.data || []);
    } catch (error) {
      if (!silent) toast.error("Failed to load registrations");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [search, filterStatus]);

  useEffect(() => {
    fetchRequests();

    // Auto-poll every 30 seconds for real-time updates
    const pollId = setInterval(() => fetchRequests(true), 30000);
    return () => clearInterval(pollId);
  }, [fetchRequests]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings/public", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch settings");
        const d = await res.json();
        
        const fetchedSpecialities = [];
        if (d.data?.filieres && d.data.filieres.length > 0) {
          fetchedSpecialities.push(...d.data.filieres.map((f: any) => f.name));
        } else if (d.data?.availableSpecialities) {
          fetchedSpecialities.push(...d.data.availableSpecialities.split(",").map((s: string) => s.trim()).filter(Boolean));
        }
        setSpecialities(fetchedSpecialities);

        if (d.data?.availablePromotions) {
          const fetchedPromotions = d.data.availablePromotions.split(",").map((s: string) => s.trim()).filter(Boolean);
          setPromotions(fetchedPromotions);
        }

        if (d.data?.currentAcademicYear) {
          setCurrentYear(d.data.currentAcademicYear);
        }
      } catch (e) {
        console.error("Settings load error:", e);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setEditData({ 
        ...selectedRequest,
        promotion: selectedRequest.promotion || selectedRequest.level || ""
      });
    } else {
      setEditData(null);
    }
  }, [selectedRequest]);

  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

  const handleClearHistory = async () => {
    try {
      const res = await fetch("/api/registrations", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        fetchRequests();
      }
    } catch (e) {
      toast.error("Failed to clear history");
    } finally {
      setIsClearModalOpen(false);
    }
  };

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED", reason?: string) => {
    if (status === "REJECTED" && !reason) {
      setIsRejectModalOpen(true);
      return;
    }

    // ── OPTIMISTIC UPDATE ────────────────────────────────────────────────────
    const previousRequests = [...requests];
    const targetRequest = requests.find(r => r.id === id);
    
    // Immediately remove from the current list view and close modals
    setRequests(prev => prev.filter(r => r.id !== id));
    setSelectedRequest(null);
    setIsRejectModalOpen(false);
    
    setUpdatingStatus(status);
    try {
      const updatedData: any = {};
      const fields = ["name", "email", "role", "studentId", "promotion", "speciality", "academicYear", "grade", "sector", "wilaya"];
      
      if (editData) {
        fields.forEach(field => {
          if (editData[field] !== targetRequest?.[field as keyof RegistrationRequest]) {
            updatedData[field] = editData[field];
          }
        });
        if (editData.role === "STUDENT" && currentYear) {
          updatedData.academicYear = currentYear;
        }
      }

      const res = await fetch(`/api/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status, 
          adminComment: reason || null,
          blockEmail,
          updatedData: Object.keys(updatedData).length > 0 ? updatedData : undefined
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Update failed");

      toast.success(`Request ${status.toLowerCase()} successfully`);
      setRejectReason("");
      setBlockEmail(false);
      // We don't need to fetchRequests() here because we already updated optimistically,
      // but we do it to ensure data integrity with other potential changes.
      fetchRequests(true); 
    } catch (error: any) {
      // Rollback on error
      setRequests(previousRequests);
      toast.error(error.message || "Failed to update request");
    } finally {
      setUpdatingStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900 dark:text-white uppercase tracking-tight">
              {t("common.registrations")}
            </h1>
            <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
              {t("settings.subtitle")}
            </p>
          </div>
          {filterStatus !== "PENDING" && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsClearModalOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10 border-red-100 dark:border-red-900/30 h-8 px-3 text-[11px] font-bold"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear History
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <select 
            className="admin-input h-9 w-full sm:w-32"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="ALL">All Requests</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              className="admin-input pl-10 h-9"
              placeholder="Search registrations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("common.name")}</th>
              <th>{t("common.role")}</th>
              <th>{t("common.date")}</th>
              <th>{t("common.status")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-8 text-gray-400">{t("common.loading")}</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-8 text-gray-400">{t("common.noData")}</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="admin-table-row">
                  <td data-label="Applicant" className="py-3 sm:py-0">
                    <div className="flex flex-col min-w-0 items-start">
                      <span className="font-medium text-gray-900 dark:text-white truncate">{req.name}</span>
                      <span className="text-[11px] text-gray-400 dark:text-slate-300 break-all">{req.email}</span>
                    </div>
                  </td>
                  <td data-label="Role">
                    <span className="text-[12px] sm:text-[13px]">{req.role}</span>
                  </td>
                  <td data-label="Date">
                    <span className="text-[13px]">{format(new Date(req.createdAt), "MMM d, yyyy")}</span>
                  </td>
                  <td data-label="Status">
                    <StatusBadge status={req.status} />
                  </td>
                  <td data-label="Actions" className="text-right">
                    <button 
                      onClick={() => setSelectedRequest(req)}
                      className="p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800 rounded transition-colors" 
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm overflow-hidden">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col border border-gray-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 rounded-t-lg flex-shrink-0">
              <h2 className="text-[15px] font-bold text-gray-900 dark:text-white uppercase tracking-tight">{t("common.registrations")}</h2>
              <button onClick={() => setSelectedRequest(null)} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-5 text-[13px] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 dark:text-gray-500 block mb-1">{t("common.name")}</label>
                  <input 
                    className="admin-input" 
                    value={editData?.name || ""} 
                    disabled={selectedRequest.status !== "PENDING"}
                    onChange={e => setEditData({...editData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-gray-400 dark:text-gray-500 block mb-1">{t("common.role")}</label>
                  <select 
                    className="admin-input" 
                    value={editData?.role || ""} 
                    disabled={selectedRequest.status !== "PENDING"}
                    onChange={e => setEditData({...editData, role: e.target.value})}
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="COMPANY">COMPANY</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 dark:text-gray-500 block mb-1">{t("common.email")}</label>
                  <input 
                    className="admin-input" 
                    value={editData?.email || ""} 
                    disabled={selectedRequest.status !== "PENDING"}
                    onChange={e => setEditData({...editData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 dark:border-slate-800 space-y-3">
                {editData?.role === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Student ID</label>
                      <input 
                        className="admin-input" 
                        value={editData?.studentId || ""} 
                        disabled={selectedRequest.status !== "PENDING"}
                        onChange={e => setEditData({...editData, studentId: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Promotion</label>
                      <select 
                        className="admin-input" 
                        value={editData?.promotion || ""} 
                        disabled={selectedRequest.status !== "PENDING"}
                        onChange={e => setEditData({...editData, promotion: e.target.value})}
                      >
                        <option value="">Select Promotion</option>
                        {promotions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Speciality</label>
                      <select 
                        className="admin-input" 
                        value={editData?.speciality || ""} 
                        disabled={selectedRequest.status !== "PENDING"}
                        onChange={e => setEditData({...editData, speciality: e.target.value})}
                      >
                        <option value="">Select Speciality</option>
                        {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Academic Year</label>
                      <div className="admin-input bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed flex items-center">
                        {currentYear || "N/A"}
                      </div>
                      <input type="hidden" value={currentYear} />
                    </div>
                  </div>
                )}

                {editData?.role === "TEACHER" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Speciality</label>
                      <select 
                        className="admin-input" 
                        value={editData?.speciality || ""} 
                        disabled={selectedRequest.status !== "PENDING"}
                        onChange={e => setEditData({...editData, speciality: e.target.value})}
                      >
                        <option value="">Select Speciality</option>
                        {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Grade</label>
                      <input 
                        className="admin-input" 
                        value={editData?.grade || ""} 
                        disabled={selectedRequest.status !== "PENDING"}
                        onChange={e => setEditData({...editData, grade: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {editData?.role === "COMPANY" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 dark:text-gray-500 block mb-1">Company</label>
                      <input 
                        className="admin-input" 
                        value={editData?.companyName || ""} 
                        disabled={selectedRequest.status !== "PENDING"}
                        onChange={e => setEditData({...editData, companyName: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 dark:text-gray-500 block mb-1">Sector</label>
                        <input 
                          className="admin-input" 
                          value={editData?.sector || ""} 
                          disabled={selectedRequest.status !== "PENDING"}
                          onChange={e => setEditData({...editData, sector: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 dark:text-gray-500 block mb-1">Wilaya</label>
                        <input 
                          className="admin-input" 
                          value={editData?.wilaya || ""} 
                          disabled={selectedRequest.status !== "PENDING"}
                          onChange={e => setEditData({...editData, wilaya: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.motivation && (
                <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
                  <label className="text-gray-400 dark:text-gray-500 block mb-1">Motivation / Extra Info</label>
                  <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.motivation}
                  </div>
                </div>
              )}

              {selectedRequest.adminComment && (
                <div className="pt-4 border-t border-gray-50 dark:border-slate-800">
                  <label className="text-gray-400 dark:text-gray-500 block mb-1">
                    {selectedRequest.status === "REJECTED" ? "Rejection Reason" : "Admin Comment"}
                  </label>
                  <div className={`p-3 rounded leading-relaxed ${
                    selectedRequest.status === "REJECTED" 
                      ? "bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/20" 
                      : "bg-blue-50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/20"
                  }`}>
                    {selectedRequest.adminComment}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end space-x-3 rounded-b-lg">
              {session?.user?.isSuperAdmin && selectedRequest.status === "PENDING" && (
                <>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    isLoading={updatingStatus === "REJECTED"}
                    disabled={updatingStatus !== null}
                    onClick={() => handleReview(selectedRequest.id, "REJECTED")}
                  >
                    {t("common.reject")}
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    isLoading={updatingStatus === "APPROVED"}
                    disabled={updatingStatus !== null}
                    onClick={() => handleReview(selectedRequest.id, "APPROVED")}
                  >
                    {t("common.approve")}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>{t("common.close")}</Button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        title="Reason for Rejection"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsRejectModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              variant="danger" 
              size="sm" 
              disabled={!rejectReason.trim()}
              isLoading={updatingStatus === "REJECTED"}
              onClick={() => handleReview(selectedRequest!.id, "REJECTED", rejectReason)}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-800/50">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-[12px] font-medium leading-tight">
              Please provide a clear reason for rejecting this registration. The user will receive this in their notification email.
            </p>
          </div>
          <div>
            <label className="text-[12px] font-bold text-gray-700 dark:text-white block mb-2 uppercase tracking-wide">
              Rejection Note
            </label>
            <textarea
              className="admin-input h-32 pt-2 resize-none focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Missing documents, incorrect student ID, or invalid profile information..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            
            <div className="mt-6 p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl flex items-center justify-between transition-all hover:bg-red-50 dark:hover:bg-red-900/20">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${blockEmail ? 'bg-red-100 dark:bg-red-900/40 text-red-600' : 'bg-gray-100 dark:bg-slate-800 text-gray-400'}`}>
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[12px] font-bold text-gray-900 dark:text-white uppercase tracking-wider">Blacklist Domain</span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">Permanently block this email address</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockEmail(!blockEmail)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ${
                  blockEmail ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'bg-gray-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`${
                    blockEmail ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 shadow-sm`}
                />
              </button>
            </div>
          </div>
        </div>
      </Modal>
      {/* Clear History Confirmation Modal */}
      <Modal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        title="Clear Registration History"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-3 w-full">
            <Button variant="ghost" size="sm" onClick={() => setIsClearModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleClearHistory}>
              Confirm Delete
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center text-center py-4">
          <div className="h-14 w-14 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="h-7 w-7" />
          </div>
          <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-tight">Are you absolutely sure?</h3>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
            This action will permanently delete all <span className="font-bold text-red-600">Approved</span> and <span className="font-bold text-red-600">Rejected</span> registration records. This cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}
