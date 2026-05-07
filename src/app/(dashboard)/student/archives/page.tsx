"use client";

import React, { useEffect, useState } from "react";
import { Archive, Calendar, Building2, User, GraduationCap, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface ArchivedInternship {
  id: string;
  academicYear: string;
  status: string;
  archivedAt: string;
  chatArchivedAt: string;
  topic: {
    title: string;
    internshipType: string;
    companyName?: string | null;
  };
  teacher: { name: string };
}

export default function StudentArchivesPage() {
  const [internships, setInternships] = useState<ArchivedInternship[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch("/api/internships?archived=true")
      .then((r) => r.json())
      .then((d) => setInternships(d.data || []))
      .catch(() => toast.error("Failed to load archives"))
      .finally(() => setIsLoading(false));
  }, []);

  // Group by academic year
  const grouped = internships.reduce<Record<string, ArchivedInternship[]>>((acc, i) => {
    (acc[i.academicYear] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
          <Archive className="h-5 w-5 text-indigo-600" /> Archives
        </h1>
        <p className="text-[13px] text-gray-500 mt-0.5">
          Your completed and archived internships. These records are read-only.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400 text-[13px]">Loading archives…</div>
      ) : internships.length === 0 ? (
        <div className="py-16 text-center">
          <Archive className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-[14px] font-medium text-gray-500">No archived internships yet</p>
          <p className="text-[12px] text-gray-400 mt-1">Completed internships will appear here after the final deadline.</p>
        </div>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => b.localeCompare(a))
          .map(([year, items]) => (
            <div key={year}>
              <h2 className="text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" /> Academic Year {year}
              </h2>
              <div className="space-y-3">
                {items.map((internship) => {
                  const chatLocked = new Date(internship.chatArchivedAt) < new Date();
                  return (
                    <div
                      key={internship.id}
                      className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={internship.status} />
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${
                              internship.topic.internshipType === "PFE"
                                ? "bg-purple-50 text-purple-700"
                                : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {internship.topic.internshipType}
                            </span>
                          </div>

                          <h3 className="text-[14px] font-semibold text-gray-900 leading-snug">
                            {internship.topic.title}
                          </h3>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-gray-500">
                            {internship.topic.companyName && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" /> {internship.topic.companyName}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3.5 w-3.5" /> {internship.teacher.name}
                            </span>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 space-y-1">
                          <p className="text-[11px] text-gray-400">
                            Archived {format(new Date(internship.archivedAt), "dd MMM yyyy")}
                          </p>
                          {chatLocked ? (
                            <span className="flex items-center gap-1 text-[11px] text-gray-400">
                              <MessageSquare className="h-3.5 w-3.5" /> Chat archived
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-[11px] text-amber-600">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Chat closes {format(new Date(internship.chatArchivedAt), "dd MMM")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
