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
  Edit,
  Trash2,
  ChevronRight
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import Link from "next/link";

interface Topic {
  id: string;
  title: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  createdAt: string;
}

export default function TeacherTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTopics = async () => {
    try {
      const res = await fetch("/api/topics?mine=true");
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

  const handleDelete = async () => {
    if (!topicToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/topics/${topicToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete topic");
      }

      toast.success("Topic deleted successfully");
      setTopics(prev => prev.filter(t => t.id !== topicToDelete.id));
      setTopicToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Could not delete topic");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">My Proposed Topics</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Manage the internship projects you have submitted for this academic year.</p>
        </div>
        <Link href="/teacher/topics/new">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            New Proposal
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
                      <span>Max {topic.maxStudents} Students</span>
                    </div>
                    <div className="flex items-center text-[12px] text-gray-600">
                      <Clock className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                      <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-4">
                   <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-gray-50 rounded-md transition-all">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setTopicToDelete(topic)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                   </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      <ConfirmDialog
        isOpen={!!topicToDelete}
        onClose={() => setTopicToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Topic Proposal"
        description={`Are you sure you want to delete "${topicToDelete?.title}"? This cannot be undone.`}
        confirmLabel="Delete Proposal"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
