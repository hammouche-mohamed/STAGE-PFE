"use client";

import React, { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Eye } from "lucide-react";

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
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);

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

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleReview = async (id: string, status: "APPROVED" | "REJECTED") => {
    const adminComment = status === "REJECTED" ? window.prompt("Reason for rejection:") : null;
    if (status === "REJECTED" && !adminComment) return;

    try {
      const res = await fetch(`/api/registrations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminComment }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(`Request ${status.toLowerCase()} successfully`);
      fetchRequests();
    } catch (error) {
      toast.error("Failed to update request");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900">Registration Requests</h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">Manage student and company account requests.</p>
        </div>
      </div>

      <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>Applicant</th>
              <th>Role</th>
              <th>Submitted At</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-8 text-gray-400">Loading requests...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-8 text-gray-400">No pending requests found.</td>
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
              <h2 className="text-[15px] font-semibold text-gray-900">Registration Details</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4 text-[13px]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 block mb-1">Full Name</label>
                  <p className="font-medium text-gray-900">{selectedRequest.name}</p>
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Role</label>
                  <p className="font-medium text-gray-900 capitalize">{selectedRequest.role.toLowerCase()}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-gray-400 block mb-1">Email</label>
                  <p className="font-medium text-gray-900">{selectedRequest.email}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 space-y-3">
                {selectedRequest.role === "STUDENT" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-gray-400 block mb-1">Student ID</label>
                      <p className="text-gray-900">{selectedRequest.studentId}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Promotion</label>
                      <p className="text-gray-900">{selectedRequest.promotion}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Speciality</label>
                      <p className="text-gray-900">{selectedRequest.speciality}</p>
                    </div>
                    <div>
                      <label className="text-gray-400 block mb-1">Academic Year</label>
                      <p className="text-gray-900">{selectedRequest.academicYear}</p>
                    </div>
                  </div>
                )}

                {selectedRequest.role === "TEACHER" && (
                  <div>
                    <label className="text-gray-400 block mb-1">Speciality</label>
                    <p className="text-gray-900">{selectedRequest.speciality}</p>
                  </div>
                )}

                {selectedRequest.role === "COMPANY" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-gray-400 block mb-1">Company</label>
                      <p className="text-gray-900">{selectedRequest.companyName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-gray-400 block mb-1">Sector</label>
                        <p className="text-gray-900">{selectedRequest.sector}</p>
                      </div>
                      <div>
                        <label className="text-gray-400 block mb-1">Wilaya</label>
                        <p className="text-gray-900">{selectedRequest.wilaya}</p>
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
                    onClick={() => {
                      handleReview(selectedRequest.id, "REJECTED");
                      setSelectedRequest(null);
                    }}
                  >
                    Reject
                  </Button>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => {
                      handleReview(selectedRequest.id, "APPROVED");
                      setSelectedRequest(null);
                    }}
                  >
                    Approve Request
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedRequest(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
