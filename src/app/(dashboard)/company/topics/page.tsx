"use client";

import React, { useEffect, useState } from "react";
import { 
  Plus, 
  Search, 
  BookOpen, 
  Users, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Edit,
  Trash2,
  ChevronRight
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import Link from "next/link";

interface Topic {
  id: string;
  title: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  createdAt: string;
  _count?: { applications: number };
}

export default function CompanyTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics");
      const data = await res.json();
      setTopics(data.data || []);
    } catch (error) {
      toast.error("Failed to load your topics");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopics();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">My Proposed Topics</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage the PFE projects you have submitted to the platform.</p>
        </div>
        <Link href="/company/topics/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Propose Topic
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">Loading topics...</div>
        ) : topics.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white border border-gray-200 rounded-md">
            <BookOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p>You haven't proposed any topics yet.</p>
            <Link href="/company/topics/new" className="text-indigo-600 text-[13px] font-medium hover:underline mt-2 inline-block">
              Submit your first topic proposal
            </Link>
          </div>
        ) : (
          topics.map((topic) => (
            <div key={topic.id} className="bg-white border border-gray-200 rounded-md p-5 hover:border-indigo-300 transition-all shadow-sm group">
              <div className="flex items-start justify-between">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={topic.status} />
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{topic.academicYear}</span>
                  </div>
                  <h3 className="text-[16px] font-bold text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">
                    {topic.title}
                  </h3>
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center text-[12px] text-gray-600">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>Capacity: {topic.maxStudents} {topic.maxStudents > 1 ? "Students" : "Student"}</span>
                    </div>
                    <div className="flex items-center text-[12px] text-gray-600">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>Published: {new Date(topic.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-4">
                   <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition-all">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-md transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                   <Link 
                     href={`/company/applications?topicId=${topic.id}`}
                     className="text-[11px] font-bold text-indigo-600 uppercase tracking-wide flex items-center hover:underline"
                   >
                     View Applications
                     <ChevronRight className="ml-1 h-3 w-3" />
                   </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
