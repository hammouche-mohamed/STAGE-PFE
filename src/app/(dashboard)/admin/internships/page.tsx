"use client";

import React, { useEffect, useState } from "react";
import { 
  Briefcase, 
  Search, 
  Filter, 
  GraduationCap, 
  Users, 
  Clock, 
  CheckCircle2, 
  XCircle,
  MoreVertical,
  ExternalLink,
  MessageSquare,
  FileText
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";

interface Internship {
  id: string;
  topic: { title: string; type: string };
  teacher: { name: string };
  students: { student: { name: string; email: string } }[];
  status: string;
  academicYear: string;
  _count: { documents: number; messages: number };
  createdAt: string;
}

export default function AdminInternshipsPage() {
  const [internships, setInternships] = useState<Internship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchInternships = async () => {
    try {
      const res = await fetch("/api/internships");
      const data = await res.json();
      setInternships(data.data || []);
    } catch (error) {
      toast.error("Failed to load internships");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, []);

  const filteredInternships = internships.filter(i => {
    const matchesSearch = i.topic.title.toLowerCase().includes(search.toLowerCase()) || 
                         i.students.some(s => s.student.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || i.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Internship Monitoring</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Global tracking of all active PFE tracks, documents, and progress.</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by student or topic title..."
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <select 
            className="admin-input min-w-[160px]"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Internships List */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Students & Topic</th>
              <th>Supervisor</th>
              <th>Progress</th>
              <th>Status</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">Loading internships...</td>
              </tr>
            ) : filteredInternships.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">No active internships found.</td>
              </tr>
            ) : (
              filteredInternships.map((internship) => (
                <tr key={internship.id} className="admin-table-row">
                  <td className="py-4">
                    <div className="flex flex-col max-w-[400px]">
                      <div className="flex items-center gap-1 mb-1">
                        {internship.students.map((s, idx) => (
                          <span key={s.student.email} className="text-[13px] font-semibold text-gray-900">
                            {s.student.name}{idx < internship.students.length - 1 ? ", " : ""}
                          </span>
                        ))}
                      </div>
                      <span className="text-[12px] text-indigo-600 font-medium line-clamp-1">
                        {internship.topic.title}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-gray-400" />
                      <span className="text-[13px] text-gray-600">{internship.teacher.name}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5" title="Documents uploaded">
                        <FileText className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[12px] font-medium text-gray-600">{internship._count.documents}</span>
                      </div>
                      <div className="flex items-center gap-1.5" title="Messages exchanged">
                        <MessageSquare className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[12px] font-medium text-gray-600">{internship._count.messages}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={internship.status} />
                  </td>
                  <td className="text-right">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </button>
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


