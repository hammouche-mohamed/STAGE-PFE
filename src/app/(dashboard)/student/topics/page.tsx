"use client";

import React, { useEffect, useState } from "react";
import { 
  Search, 
  Filter, 
  BookOpen, 
  Building2, 
  User, 
  ChevronRight,
  Info,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface Topic {
  id: string;
  title: string;
  description: string;
  type: string;
  proposedBy: { name: string };
  maxStudents: number;
}

export default function StudentTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

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

  const handleApply = async (topicId: string) => {
    toast.info("Application feature coming soon. Please contact the administrator.");
  };

  const filteredTopics = topics.filter(t => 
    t.title.toLowerCase().includes(search.toLowerCase()) || 
    t.proposedBy.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Available PFE Topics</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Explore project proposals from companies and professors.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search topics by keywords, technology, or company..."
            className="admin-input pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button variant="outline" className="h-[36px]">
          <Filter className="h-4 w-4 mr-2" />
          Filter by Specialty
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-full text-center py-12 text-gray-400">Loading topics...</div>
        ) : filteredTopics.length === 0 ? (
          <div className="col-span-full text-center py-12 text-gray-400">No topics found matching your search.</div>
        ) : (
          filteredTopics.map((topic) => (
            <div key={topic.id} className="bg-white border border-gray-200 rounded-md p-6 flex flex-col justify-between hover:border-indigo-400 transition-all shadow-sm group">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase rounded">
                      {topic.type === "COMPANY_PROPOSED" ? "Company" : "Professor"}
                    </span>
                  </div>
                  <span className="text-[12px] text-gray-400 font-medium">Cap: {topic.maxStudents} students</span>
                </div>
                
                <h3 className="text-[15px] font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                  {topic.title}
                </h3>
                
                <p className="text-[12px] text-gray-500 line-clamp-3 leading-relaxed">
                  {topic.description}
                </p>

                <div className="flex items-center gap-4 pt-2">
                   <div className="flex items-center text-[12px] text-gray-600">
                     <Building2 className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                     {topic.proposedBy.name}
                   </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between">
                <button className="text-[12px] font-semibold text-gray-500 flex items-center hover:text-gray-900">
                  <Info className="h-4 w-4 mr-1.5" />
                  View Details
                </button>
                <Button 
                  onClick={() => handleApply(topic.id)}
                  size="sm" 
                  className="px-6"
                >
                  Apply Now
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
