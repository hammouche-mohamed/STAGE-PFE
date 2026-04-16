"use client";

import React, { useEffect, useState } from "react";
import { 
  BookOpen, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Tag,
  Building2,
  Users,
  ChevronRight,
  User,
  GraduationCap
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";

interface Topic {
  id: string;
  title: string;
  type: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  proposedBy: { name: string };
  assignedTeacher?: { name: string } | null;
  createdAt: string;
}

export default function AdminTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.data || []);
    } catch (error) {
      toast.error("Failed to load topics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  const filteredTopics = topics.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || 
                         t.proposedBy.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Topic Repository</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Approve and manage PFE topics proposed by teachers, students, and companies.</p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by title or proposer..."
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
            <option value="PENDING_ADMIN">Waiting Approval</option>
            <option value="OPEN_FOR_SELECTION">Open</option>
            <option value="APPROVED">Approved</option>
            <option value="TAKEN">Assigned</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* Topics List - Using Cards for better detail display */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">Loading topics...</div>
        ) : filteredTopics.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">No topics found.</div>
        ) : (
          filteredTopics.map((topic) => (
            <Link 
              key={topic.id} 
              href={`/admin/topics/${topic.id}`}
              className="bg-white border border-gray-200 rounded-md p-4 hover:border-indigo-300 transition-all group cursor-pointer shadow-sm hover:shadow-md active:scale-[0.99] block"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1 pr-6 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={topic.status} />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{topic.academicYear}</span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                    {topic.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-y-2 gap-x-4 mt-3">
                    <div className="flex items-center text-[12px] text-gray-500">
                      <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span className="font-medium text-gray-700">{topic.proposedBy.name}</span>
                      <span className="mx-1 text-gray-300">•</span>
                      <span className="text-[11px] uppercase">{topic.type.replace('_', ' ')}</span>
                    </div>
                    {topic.assignedTeacher && (
                      <div className="flex items-center text-[12px] text-gray-500">
                        <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                        <span>Supervised by: {topic.assignedTeacher.name}</span>
                      </div>
                    )}
                    <div className="flex items-center text-[12px] text-gray-500">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>Capacity: {topic.maxStudents} {topic.maxStudents > 1 ? "students" : "student"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3 self-center">
                  <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

// Minimal missing component for this specific view

