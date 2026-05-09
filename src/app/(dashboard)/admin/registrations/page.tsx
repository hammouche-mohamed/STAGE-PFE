"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Eye, AlertTriangle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
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
  sector?: string;
  wilaya?: string;
}

export default function AdminRegistrationsPage() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [editData, setEditData] = useState<any>(null);
  const [specialities, setSpecialities] = useState<string[]>([]);
  const [promotions, setPromotions] = useState<string[]>([]);
  const [currentYear, setCurrentYear] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [blockEmail, setBlockEmail] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/registrations");
      const data = await res.json();
      setRequests(data.data || []);
    } catch (error) {
      toast.error("Failed to load registrations");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings/public");
      const d = await res.json();
      if (d.data?.availableSpecialities) {
        setSpecialities(d.data.availableSpecialities.split(",").map((s: string) => s.trim()).filter(Boolean));
      }
      if (d.data?.availablePromotions) {
        setPromotions(d.data.availablePromotions.split(",").map((s: string) => s.trim()).filter(Boolean));
      }
      if (d.data?.currentAcademicYear) {
        setCurrentYear(d.data.currentAcademicYear);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchRequests();
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setEditData({ ...selectedRequest });
    } else {
      setEditData(null);
    }
  }, [selectedRequest]);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED", reason?: string) => {
    if (status === "REJECTED" && !reason) {
      setIsRejectModalOpen(true);
      return;
    }

    setIsUpdating(true);
    try {
      // Calculate updatedData by comparing editData with selectedRequest
      const updatedData: any = {};
      const fields = ["name", "email", "role", "studentId", "promotion", "speciality", "academicYear", "grade", "sector", "wilaya"];
      fields.forEach(field => {
        if (editData[field] !== selectedRequest![field as keyof RegistrationRequest]) {
          updatedData[field] = editData[field];
        }
      });

      // NFR-RDI3: Always enforce the current system academic year on approval
      if (editData.role === "STUDENT" && currentYear) {
        updatedData.academicYear = currentYear;
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

      if (!res.ok) throw new Error("Update failed");

      toast.success(`Request ${status.toLowerCase()} successfully`);
      setSelectedRequest(null);
      setIsRejectModalOpen(false);
      setRejectReason("");
      setBlockEmail(false);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to update request");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900">{t("common.registrations")}</h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{t("settings.subtitle")}</p>
        </div>
      </div>

      <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
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
                      <span className="font-medium text-gray-900 truncate">{req.name}</span>
                      <span className="text-[11px] text-gray-400 truncate">{req.email}</span>
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
                      className="p-1 text-gray-400 hover:bg-gray-50 rounded" 
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-md shadow-xl w-full max-w-lg mt-10 mb-10">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
              <h2 className="text-[15px] font-semibold text-gray-900">{t("common.registrations")}</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 block mb-1">{t("common.name")}</label>
                  <input 
                    className="admin-input" 
                    value={editData?.name || ""} 
                    onChange={e => setEditData({...editData, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">{t("common.role")}</label>
                  <select 
                    className="admin-input" 
                    value={editData?.role || ""} 
                    onChange={e => setEditData({...editData, role: e.target.value})}
                  >
                    <option value="STUDENT">STUDENT</option>
                    <option value="TEACHER">TEACHER</option>
                    <option value="COMPANY">COMPANY</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">{t("common.email")}</label>
                  <input 
                    className="admin-input" 
                    value={editData?.email || ""} 
                    onChange={e => setEditData({...editData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 space-y-3">
                {editData?.role === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 block mb-1">Student ID</label>
                      <input 
                        className="admin-input" 
                        value={editData?.studentId || ""} 
                        onChange={e => setEditData({...editData, studentId: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Promotion</label>
                      <select 
                        className="admin-input" 
                        value={editData?.promotion || ""} 
                        onChange={e => setEditData({...editData, promotion: e.target.value})}
                      >
                        <option value="">Select Promotion</option>
                        {promotions.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Speciality</label>
                      <select 
                        className="admin-input" 
                        value={editData?.speciality || ""} 
                        onChange={e => setEditData({...editData, speciality: e.target.value})}
                      >
                        <option value="">Select Speciality</option>
                        {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Academic Year</label>
                      <div className="admin-input bg-gray-50 text-gray-500 cursor-not-allowed flex items-center">
                        {currentYear || "N/A"}
                      </div>
                      <input type="hidden" value={currentYear} />
                    </div>
                  </div>
                )}

                {editData?.role === "TEACHER" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 block mb-1">Speciality</label>
                      <select 
                        className="admin-input" 
                        value={editData?.speciality || ""} 
                        onChange={e => setEditData({...editData, speciality: e.target.value})}
                      >
                        <option value="">Select Speciality</option>
                        {specialities.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Grade</label>
                      <input 
                        className="admin-input" 
                        value={editData?.grade || ""} 
                        onChange={e => setEditData({...editData, grade: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {editData?.role === "COMPANY" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Company</label>
                      <input 
                        className="admin-input" 
                        value={editData?.companyName || ""} 
                        onChange={e => setEditData({...editData, companyName: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 block mb-1">Sector</label>
                        <input 
                          className="admin-input" 
                          value={editData?.sector || ""} 
                          onChange={e => setEditData({...editData, sector: e.target.value})}
                        />
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">Wilaya</label>
                        <input 
                          className="admin-input" 
                          value={editData?.wilaya || ""} 
                          onChange={e => setEditData({...editData, wilaya: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedRequest.motivation && (
                <div className="pt-4 border-t border-gray-50">
                  <label className="text-gray-400 block mb-1">Motivation / Extra Info</label>
                  <div className="bg-gray-50 p-3 rounded text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {selectedRequest.motivation}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end space-x-3 rounded-b-lg">
              {selectedRequest.status === "PENDING" && (
                <>
                  <Button 
                    variant="danger" 
                    size="sm" 
                    isLoading={isUpdating}
                    onClick={() => handleReview(selectedRequest.id, "REJECTED")}
                  >
                    {t("common.reject")}
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    isLoading={isUpdating}
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
              isLoading={isUpdating}
              onClick={() => handleReview(selectedRequest!.id, "REJECTED", rejectReason)}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <p className="text-[12px] font-medium leading-tight">
              Please provide a clear reason for rejecting this registration. The user will receive this in their notification email.
            </p>
          </div>
          <div>
            <label className="text-[12px] font-bold text-gray-700 block mb-2 uppercase tracking-wide">
              Rejection Note
            </label>
            <textarea
              className="admin-input h-32 pt-2 resize-none focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Missing documents, incorrect student ID, or invalid profile information..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              autoFocus
            />
            
            <div className="mt-4 flex items-center gap-2">
              <input 
                type="checkbox" 
                id="blockEmail" 
                className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                checked={blockEmail}
                onChange={(e) => setBlockEmail(e.target.checked)}
              />
              <label htmlFor="blockEmail" className="text-[12px] font-medium text-gray-700 select-none cursor-pointer">
                Also permanently block this email address
              </label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
