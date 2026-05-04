"use client";

import React, { useEffect, useState } from "react";
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  FileText, 
  MessageSquare, 
  Calendar,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { UserProfileModal } from "@/components/ui/UserProfileModal";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Internship {
  id: string;
  status: string;
  topic: {
    title: string;
    description: string;
  };
  teacher: {
    id: string;
    name: string;
  };
  students: {
    isLeader: boolean;
    student: {
      id: string;
      name: string;
    };
  }[];
  startDate: string | null;
  endDate: string | null;
  internshipType: string;
  midtermDeadline: string | null;
  finalDeadline: string | null;
  _count: {
    documents: number;
  };
}

interface Deadline {
  id: string;
  label: string;
  dueDate: string;
}

interface Message {
  id: string;
  content: string;
  sentAt: string;
  sender: {
    name: string;
  };
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const { t, isRTL } = useTranslation();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewUserId, setViewUserId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/internships");
        if (res.ok) {
          const data = await res.json();
          const active = (data.data as Internship[] || []).find(
            (i) => !["CANCELLED", "COMPLETED"].includes(i.status)
          );
          if (active) setInternship(active);
        }

        const msgRes = await fetch("/api/messages/recent");
        if (msgRes.ok) {
          const data = await msgRes.json();
          setRecentMessages(data.data || []);
        }

        const deadlineRes = await fetch("/api/deadlines");
        if (deadlineRes.ok) {
          const data = await deadlineRes.json();
          setDeadlines(data.data || []);
        }
      } catch (error) {
        console.error("Dashboard load failed", error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const daysUntil = (date: string) =>
    Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-[13px]">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Welcome Header ────────────────────────────────────────── */}
      <div className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}>
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">
            {t("dashboard.welcome")}, {session?.user?.name}! 👋
          </h1>
          <p className="text-[13px] text-gray-500 mt-0.5">{t("common.appSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[36px] px-4 bg-white border border-gray-200 rounded flex items-center gap-2 text-[12px] text-gray-600">
            <Calendar className="h-4 w-4 text-gray-400" />
            {format(new Date(), "MMMM d, yyyy")}
          </div>
        </div>
      </div>

      {/* ── Status Row ─────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Status */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("common.status")}</p>
          {internship ? (
            <>
              <StatusBadge status={internship.status} />
              <p className="text-[12px] text-gray-500 mt-2 truncate">{internship.topic.title}</p>
            </>
          ) : (
            <p className="text-[13px] text-gray-400">{t("dashboard.noInternship")}</p>
          )}
        </div>

        {/* Deadlines */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("common.deadlines")}</p>
          {deadlines.length > 0 ? (
            <>
              <p className="text-[20px] font-bold text-gray-900">
                {daysUntil(deadlines[0].dueDate)} {t("common.deadlines")}
              </p>
              <p className="text-[12px] text-red-500 font-medium mt-1">{deadlines[0].label}</p>
            </>
          ) : (
            <p className="text-[13px] text-gray-400">{t("common.noData")}</p>
          )}
        </div>

        {/* Documents */}
        <div className="bg-white border border-gray-200 rounded-md p-5">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("common.documents")}</p>
          {internship ? (
            <>
              <p className="text-[20px] font-bold text-gray-900">{internship._count.documents} uploaded</p>
              <Link href="/student/documents" className="text-[12px] text-indigo-600 font-medium hover:underline mt-1 block">
                {t("documents.upload")} →
              </Link>
            </>
          ) : (
            <p className="text-[13px] text-gray-400">—</p>
          )}
        </div>
      </div>

      {/* ── Main Dashboard Content ─────────────────────────────────── */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
        {/* Internship Details */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-md p-6">
          <div className={`flex items-center justify-between mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
            <h2 className="text-[14px] font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-indigo-600" />
              {t("dashboard.activeInternship")}
            </h2>
            {internship && (
              <Link href="/student/internship" className="text-[12px] text-indigo-600 hover:underline">
                {t("common.view")}
              </Link>
            )}
          </div>

          {!internship ? (
            <div className="text-center py-10">
              <Briefcase className="h-10 w-10 text-gray-100 mx-auto mb-3" />
              <p className="text-[13px] text-gray-400">{t("dashboard.noInternship")}</p>
              <Link href="/student/topics" className="text-[12px] text-indigo-600 hover:underline mt-2 block">
                {t("dashboard.browseTopics")}
              </Link>
            </div>
          ) : (
            <div className={`space-y-6 ${isRTL ? "text-right" : ""}`}>
              <div className="bg-gray-50 rounded p-4">
                <p className="text-[14px] font-semibold text-gray-900">{internship.topic.title}</p>
                <p className="text-[13px] text-gray-500 mt-1">{internship.topic.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 text-[13px]">
                <div>
                  <p className="text-gray-400 font-medium mb-1">{t("dashboard.supervisor")}</p>
                  <p className="text-gray-900 font-medium">{internship.teacher.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium mb-1">{t("dashboard.team")}</p>
                  <div className={`flex items-center gap-2 ${isRTL ? "flex-row-reverse" : ""}`}>
                    {internship.students.map((s, i) => (
                      <div key={`${s.student.id}-${i}`} className="h-7 w-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-bold text-indigo-700">
                        {s.student.name[0]}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Messages */}
        <div className="bg-white border border-gray-200 rounded-md p-6">
          <h2 className={`text-[14px] font-semibold text-gray-900 flex items-center gap-2 mb-6 ${isRTL ? "flex-row-reverse" : ""}`}>
            <MessageSquare className="h-4 w-4 text-indigo-600" />
            {t("common.messages")}
          </h2>
          {recentMessages.length === 0 ? (
            <p className="text-[13px] text-gray-400">{t("messages.noMessages")}</p>
          ) : (
            <div className="space-y-4">
              {recentMessages.map((m) => (
                <div key={m.id} className="text-[13px]">
                  <p className="font-semibold text-gray-800">{m.sender.name}</p>
                  <p className="text-gray-600 truncate">{m.content}</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    {format(new Date(m.sentAt), "MMM d, HH:mm")}
                  </p>
                </div>
              ))}
              <Link href="/student/messages" className="text-[12px] text-indigo-600 hover:underline mt-4 block">
                {t("nav.messages")} →
              </Link>
            </div>
          )}
        </div>
      </div>

      <UserProfileModal userId={viewUserId} onClose={() => setViewUserId(null)} />
    </div>
  );
}
