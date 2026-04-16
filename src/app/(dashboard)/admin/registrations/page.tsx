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
}

export default function AdminRegistrationsPage() {
  const [requests, setRequests] = useState<RegistrationRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Registration Requests</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage new student and company account requests.</p>
        </div>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
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
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">Loading requests...</td>
              </tr>
            ) : requests.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">No pending requests found.</td>
              </tr>
            ) : (
              requests.map((req) => (
                <tr key={req.id} className="admin-table-row">
                  <td>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{req.name}</span>
                      <span className="text-[11px] text-gray-400">{req.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[13px]">{req.role}</span>
                  </td>
                  <td>
                    <span className="text-[13px]">{format(new Date(req.createdAt), "MMM d, yyyy HH:mm")}</span>
                  </td>
                  <td>
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleReview(req.id, "APPROVED")}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Approve"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleReview(req.id, "REJECTED")}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Reject"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button className="p-1 text-gray-400 hover:bg-gray-50 rounded" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
