"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { 
  Archive, 
  Download, 
  Filter, 
  Users, 
  UserCheck, 
  Building2, 
  BookOpen, 
  MessageSquare,
  ChevronRight,
  Info,
  FileText,
  ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { useSession } from "next-auth/react";

type TabType = "internships" | "students" | "teachers" | "companies" | "topics" | "documents" | "audit";

export default function AdminArchivesPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  
  const [activeTab, setActiveTab] = useState<TabType>("internships");
  const [archiveData, setArchiveData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [filiereFilter, setFiliereFilter] = useState<string>("all");
  const [filieres, setFilieres] = useState<any[]>([]);
  const [exportType, setExportType] = useState<string>("all");
  const [isExporting, setIsExporting] = useState(false);

  // Accurate Year Generation
  const now = new Date();
  const currentMonth = now.getMonth();
  const startYear = currentMonth >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  const years = Array.from({ length: 4 }, (_, i) => {
    const y = startYear - i;
    return `${y}-${y + 1}`;
  });

  // Default to current year if not set
  useEffect(() => {
    if (!selectedYear && years.length > 0) {
      setSelectedYear(years[0]);
    }
  }, [years]);

  useEffect(() => {
    if (session?.user?.isSuperAdmin) {
      fetch("/api/filieres")
        .then(res => res.json())
        .then(data => setFilieres(data.data || []));
    }
  }, [session]);

  const fetchData = async () => {
    if (!selectedYear) return;
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear,
        type: activeTab,
      });
      if (filiereFilter !== "all") params.set("filiereId", filiereFilter);
      
      const res = await fetch(`/api/admin/archives/data?${params}`);
      const data = await res.json();
      setArchiveData(data.data || []);
    } catch {
      toast.error("Failed to load archive data");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear, filiereFilter, activeTab]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType });
      if (selectedYear) params.set("year", selectedYear);
      if (filiereFilter !== "all") params.set("filiereId", filiereFilter);
      
      const res = await fetch(`/api/admin/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archive_${selectedYear}_${exportType}_${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded successfully");
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const renderInternships = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>Topic / Team</th>
          <th>Type</th>
          <th>Teacher</th>
          <th className="text-center">Messages</th>
          <th className="text-center">Docs</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((i) => (
          <tr key={i.id} className="admin-table-row">
            <td>
              <p className="font-medium text-gray-900 dark:text-white text-[13px]">{i.topic.title}</p>
              <p className="text-[11px] text-gray-400">{i.students.map((s: any) => s.student.name).join(" & ")}</p>
            </td>
            <td>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${i.topic.internshipType === 'PFE' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {i.topic.internshipType}
              </span>
            </td>
            <td className="text-[12px]">{i.teacher.name}</td>
            <td className="text-center font-bold text-indigo-600">{i._count.messages}</td>
            <td className="text-center font-bold text-blue-600">{i._count.documents}</td>
            <td>
              <span className="text-[11px] font-medium text-gray-500 uppercase">{i.status.replace(/_/g, ' ')}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderStudents = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>Student</th>
          <th>Speciality</th>
          <th>Department</th>
          <th>Internship</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((s) => (
          <tr key={s.id} className="admin-table-row">
            <td>
              <p className="font-medium text-[13px]">{s.name}</p>
              <p className="text-[11px] text-gray-400">{s.email}</p>
            </td>
            <td className="text-[12px]">{s.studentProfile?.speciality}</td>
            <td className="text-[12px]">{s.studentProfile?.filiere?.name || "—"}</td>
            <td>
              {s.internshipStudents?.[0] ? (
                <span className="text-[11px] text-emerald-600 font-medium">
                  Assigned: {s.internshipStudents[0].internship.topic.title.substring(0, 30)}...
                </span>
              ) : (
                <span className="text-[11px] text-gray-400 italic">No internship assigned</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTeachers = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>Teacher</th>
          <th>Grade</th>
          <th>Department</th>
          <th className="text-center">Internships</th>
          <th className="text-center">Topics</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((t) => (
          <tr key={t.id} className="admin-table-row">
            <td>
              <p className="font-medium text-[13px]">{t.name}</p>
              <p className="text-[11px] text-gray-400">{t.email}</p>
            </td>
            <td className="text-[12px]">{t.teacherProfile?.grade || "—"}</td>
            <td className="text-[12px]">{t.teacherProfile?.filiere?.name || "—"}</td>
            <td className="text-center font-bold text-indigo-600">{t._count.internships}</td>
            <td className="text-center font-bold text-emerald-600">{t._count.proposedTopics}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderCompanies = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>Company</th>
          <th>Sector</th>
          <th>Location</th>
          <th className="text-center">Topics Proposed</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((c) => (
          <tr key={c.id} className="admin-table-row">
            <td>
              <p className="font-medium text-[13px]">{c.companyProfile?.companyName || c.name}</p>
              <p className="text-[11px] text-gray-400">{c.email}</p>
            </td>
            <td className="text-[12px]">{c.companyProfile?.sector || "—"}</td>
            <td className="text-[12px]">{c.companyProfile?.wilaya || "—"}</td>
            <td className="text-center font-bold text-emerald-600">{c._count.proposedTopics}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTopics = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>Topic Title</th>
          <th>Type</th>
          <th>Proposed By</th>
          <th className="text-center">Applications</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((tp) => (
          <tr key={tp.id} className="admin-table-row">
            <td>
              <p className="font-medium text-[13px] truncate max-w-[300px]">{tp.title}</p>
            </td>
            <td>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tp.internshipType === 'PFE' ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                {tp.internshipType}
              </span>
            </td>
            <td className="text-[12px]">{tp.proposedBy.name}</td>
            <td className="text-center font-bold text-indigo-600">{tp._count.studentApplications}</td>
            <td>
              <span className="text-[11px] font-medium text-gray-500 uppercase">{tp.status.replace(/_/g, ' ')}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderDocuments = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>File Name</th>
          <th>Topic</th>
          <th>Uploaded By</th>
          <th>Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((d) => (
          <tr key={d.id} className="admin-table-row">
            <td>
              <p className="font-medium text-[13px]">{d.fileName}</p>
              <p className="text-[10px] text-gray-400">Type: {d.type}</p>
            </td>
            <td className="text-[12px]">{d.internship.topic.title.substring(0, 40)}...</td>
            <td>
              <p className="text-[12px]">{d.uploadedBy.name}</p>
              <p className="text-[10px] text-gray-400">{d.uploadedBy.role}</p>
            </td>
            <td className="text-[12px] text-gray-500">{format(new Date(d.uploadedAt), "MMM d, yyyy")}</td>
            <td>
              <span className="text-[11px] font-medium uppercase text-gray-500">{d.status}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderAudit = () => (
    <table className="admin-table">
      <thead className="admin-table-header">
        <tr>
          <th>Action</th>
          <th>Performed By</th>
          <th>Target</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {archiveData.map((a) => (
          <tr key={a.id} className="admin-table-row">
            <td>
               <span className="text-[11px] font-bold bg-gray-50 px-2 py-0.5 rounded border italic">
                 {a.action.replace(/_/g, ' ')}
               </span>
            </td>
            <td>
              <p className="font-medium text-[12px]">{a.user.name}</p>
              <p className="text-[10px] text-gray-400">{a.user.email}</p>
            </td>
            <td className="text-[12px] text-gray-500">{a.targetType} ({a.targetId})</td>
            <td className="text-[12px] text-gray-400">{format(new Date(a.createdAt), "MMM d, HH:mm")}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const tabs = [
    { id: "internships", label: t("common.internships"), icon: MessageSquare },
    { id: "students", label: t("archivesPage.students"), icon: Users },
    { id: "teachers", label: t("archivesPage.teachers"), icon: UserCheck },
    { id: "companies", label: t("archivesPage.companies"), icon: Building2 },
    { id: "topics", label: t("archivesPage.allTopics"), icon: BookOpen },
    { id: "documents", label: t("common.documents"), icon: FileText },
    { id: "audit", label: t("common.auditLogs"), icon: ClipboardList },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Archive className="h-5 w-5 text-indigo-600" />
            {t("nav.archives")} - {selectedYear}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
            Complete historical oversight of all platform data for the selected academic year.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="admin-input h-9 py-0 text-[12px] min-w-[140px] appearance-none pr-8"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 rotate-90" />
          </div>
          <Button size="sm" variant="outline" onClick={handleExport} isLoading={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {t("common.export")}
          </Button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-100 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 px-6 py-3 text-[13px] font-medium border-b-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {activeTab === tab.id && !isLoading && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold">
                {archiveData.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-800/30 rounded-xl border border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Department Filter</span>
          </div>
          <select
            className="admin-input h-8 py-0 text-[12px] min-w-[200px]"
            value={filiereFilter}
            onChange={(e) => setFiliereFilter(e.target.value)}
          >
            <option value="all">All Departments</option>
            {filieres.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <Info className="h-3.5 w-3.5" />
          Records are read-only for historical reference.
        </div>
      </div>

      {/* Main Content Table */}
      <div className="admin-table-container">
        {isLoading ? (
          <div className="py-20 text-center text-gray-400 italic flex flex-col items-center gap-3">
             <div className="h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
             {t("common.loading")}
          </div>
        ) : archiveData.length === 0 ? (
          <div className="py-24 text-center text-gray-400 flex flex-col items-center gap-4">
             <Archive className="h-10 w-10 opacity-20" />
             <div className="flex flex-col gap-1">
                <p className="font-bold text-[14px]">No historical data found</p>
                <p className="text-[12px]">Try selecting a different academic year or department.</p>
             </div>
          </div>
        ) : (
          <>
            {activeTab === "internships" && renderInternships()}
            {activeTab === "students" && renderStudents()}
            {activeTab === "teachers" && renderTeachers()}
            {activeTab === "companies" && renderCompanies()}
            {activeTab === "topics" && renderTopics()}
            {activeTab === "documents" && renderDocuments()}
            {activeTab === "audit" && renderAudit()}
          </>
        )}
      </div>
    </div>
  );
}
