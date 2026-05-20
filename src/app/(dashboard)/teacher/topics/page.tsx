"use client";

import React, { useEffect, useMemo, useState } from "react";
import { BookOpen, Users, Eye, GraduationCap, Layers } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Topic {
  id: string;
  title: string;
  status: string;
  academicYear: string;
  maxStudents: number;
  createdAt: string;
  assignedTeacherId: string | null;
  description?: string | null;
  requiredSkills?: string | null;
  type?: string | null;
  internshipType?: string | null;
  targetLevels?: string | null;
  filiere?: { name?: string | null } | null;
  proposedBy?: { id: string; name: string } | null;
  teacherApplications?: { id: string; status: string }[];
}

type Tab = "SUPERVISING" | "REQUESTED" | "MARKETPLACE";

export default function TeacherTopicsPage() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const myId = (session as any)?.user?.id;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("SUPERVISING");
  const [isApplying, setIsApplying] = useState<string | null>(null);
  // Tracks which assignment decision is currently in-flight so only the
  // pressed button (Accept OR Decline) spins, while the other is disabled.
  const [pendingDecision, setPendingDecision] = useState<"ACCEPT" | "REJECT" | null>(null);
  const [viewTopic, setViewTopic] = useState<Topic | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "apply" | "cancel" | "accept" | "decline";
    topic: Topic;
  } | null>(null);

  const fetchTopics = async () => {
    // Always pull fresh data so a cancelled / declined supervision request
    // re-surfaces in the marketplace immediately instead of showing the
    // cached "Requested" snapshot.
    try {
      const res = await fetch("/api/topics", { cache: "no-store" });
      const data = await res.json();
      setTopics(data.data || []);
    } catch {
      toast.error(t("toast.loadTopicsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (session) fetchTopics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const { supervising, requested, marketplace } = useMemo(() => {
    const supervising: Topic[] = [];
    const requested: Topic[] = [];
    const marketplace: Topic[] = [];
    for (const tp of topics) {
      const applied = (tp.teacherApplications?.length ?? 0) > 0;
      const officiallyTaken =
        !!tp.assignedTeacherId && tp.status !== "PENDING_TEACHER";

      // Topics where this teacher has officially accepted (assignedTeacherId
      // is them AND status moved past PENDING_TEACHER) live in Supervising.
      // A PENDING_TEACHER topic assigned to them is NOT being supervised yet
      // — it's still an active marketplace decision, so it stays there with
      // an "Awaiting your response" badge.
      if (tp.assignedTeacherId === myId && tp.status !== "PENDING_TEACHER") {
        supervising.push(tp);
      } else if (applied && !officiallyTaken) {
        requested.push(tp);
      } else if (
        !officiallyTaken &&
        (tp.status === "APPROVED" || tp.status === "OPEN_FOR_SELECTION") &&
        !tp.assignedTeacherId &&
        !applied
      ) {
        // Plain open marketplace: APPROVED / OPEN_FOR_SELECTION with no
        // supervisor yet and no application from me.
        marketplace.push(tp);
      } else if (
        tp.status === "PENDING_TEACHER" &&
        tp.assignedTeacherId === myId
      ) {
        // Admin invited ME — sits in Marketplace with Accept/Decline so the
        // decision happens in the same place as a normal marketplace action.
        marketplace.push(tp);
      }
    }
    return { supervising, requested, marketplace };
  }, [topics, myId]);

  const lists: Record<Tab, Topic[]> = {
    SUPERVISING: supervising,
    REQUESTED: requested,
    MARKETPLACE: marketplace,
  };
  const rows = lists[activeTab];

  const handleApply = async (topicId: string) => {
    setIsApplying(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/apply-supervision`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("teacherTopics.applyFailed"));
      toast.success(t("teacherTopics.requestSent"));
      setViewTopic(null);
      fetchTopics();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApplying(null);
    }
  };

  const handleCancelRequest = async (topicId: string) => {
    setIsApplying(topicId);
    try {
      const res = await fetch(`/api/topics/${topicId}/apply-supervision`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("teacherTopics.cancelFailed"));
      toast.success(t("teacherTopics.requestCancelled"));
      setViewTopic(null);
      fetchTopics();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApplying(null);
    }
  };

  // Admin assigned this teacher to supervise — the teacher must explicitly
  // accept or decline (topic sits in PENDING_TEACHER until they do).
  const handleSupervisionDecision = async (
    topicId: string,
    action: "ACCEPT" | "REJECT",
  ) => {
    setIsApplying(topicId);
    setPendingDecision(action);
    try {
      const res = await fetch(`/api/topics/${topicId}/teacher-action`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("teacherTopics.decisionFailed"));
      toast.success(t("teacherTopics.decisionSaved"));
      setViewTopic(null);
      fetchTopics();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsApplying(null);
      setPendingDecision(null);
    }
  };

  const runConfirm = () => {
    if (!confirmAction) return;
    const { type, topic } = confirmAction;
    setConfirmAction(null);
    if (type === "apply") handleApply(topic.id);
    else if (type === "cancel") handleCancelRequest(topic.id);
    else if (type === "accept") handleSupervisionDecision(topic.id, "ACCEPT");
    else if (type === "decline") handleSupervisionDecision(topic.id, "REJECT");
  };

  const TABS: { id: Tab; label: string }[] = [
    { id: "SUPERVISING", label: `${t("teacherTopics.tabSupervising")} (${supervising.length})` },
    { id: "REQUESTED", label: `${t("teacherTopics.tabRequested")} (${requested.length})` },
    { id: "MARKETPLACE", label: `${t("teacherTopics.tabMarketplace")} (${marketplace.length})` },
  ];

  const canApply =
    !!viewTopic &&
    !viewTopic.assignedTeacherId &&
    (viewTopic.teacherApplications?.length ?? 0) === 0 &&
    (viewTopic.status === "APPROVED" || viewTopic.status === "OPEN_FOR_SELECTION");

  // Teacher has a still-pending request the admin hasn't acted on yet.
  const canCancelRequest =
    !!viewTopic &&
    !viewTopic.assignedTeacherId &&
    (viewTopic.teacherApplications ?? []).some((a) => a.status === "PENDING");

  // Admin assigned this teacher; they must accept or decline the supervision.
  const canRespondToAssignment =
    !!viewTopic &&
    viewTopic.assignedTeacherId === myId &&
    viewTopic.status === "PENDING_TEACHER";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">
          {t("common.topics")}
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
          {t("dashboard.browseTopics")}
        </p>
      </div>

      {/* Filter tabs: supervised vs requested vs available */}
      <div className="flex items-center gap-1 bg-gray-100/50 dark:bg-slate-800/50 p-1 rounded-lg w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-[12px] font-bold rounded-md transition-all ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr>
              <th>{t("common.topics")}</th>
              <th>{t("topics.maxStudents")}</th>
              <th>{t("common.status")}</th>
              <th>{t("common.date")}</th>
              <th className="text-right">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">
                  {t("common.loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <BookOpen className="h-8 w-8 text-gray-200 dark:text-slate-800" />
                    <p>
                      {activeTab === "SUPERVISING"
                        ? t("teacherTopics.emptySupervising")
                        : activeTab === "REQUESTED"
                          ? t("teacherTopics.emptyRequested")
                          : t("teacherTopics.emptyMarketplace")}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((topic) => (
                <tr key={topic.id} className="admin-table-row group">
                  <td data-label="Topic">
                    <div className="flex flex-col gap-1 text-right sm:text-left">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {topic.title}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                        {topic.academicYear}
                      </span>
                    </div>
                  </td>
                  <td data-label="Capacity">
                    <div className="flex items-center gap-1.5 justify-end sm:justify-start">
                      <Users className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
                      <span className="text-[13px] text-gray-600 dark:text-gray-300">
                        {topic.maxStudents}
                      </span>
                    </div>
                  </td>
                  <td data-label="Status">
                    {activeTab === "REQUESTED" ? (
                      <StatusBadge status="PENDING" label={t("teacherTopics.statusRequestPending")} />
                    ) : activeTab === "SUPERVISING" ? (
                      <StatusBadge status="APPROVED" label={t("teacherTopics.statusSupervising")} />
                    ) : topic.status === "PENDING_TEACHER" && topic.assignedTeacherId === myId ? (
                      // Marketplace + admin assigned me but I haven't accepted.
                      <StatusBadge status="PENDING" label={t("teacherTopics.statusAwaitingResponse")} />
                    ) : (
                      <StatusBadge status={topic.status} />
                    )}
                  </td>
                  <td data-label="Date">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">
                      {new Date(topic.createdAt).toLocaleDateString()}
                    </span>
                  </td>
                  <td data-label="Actions" className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-[11px] font-bold"
                        onClick={() => setViewTopic(topic)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        {t("common.view")}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Topic details — must be seen before applying */}
      <Modal
        isOpen={!!viewTopic}
        onClose={() => setViewTopic(null)}
        title={t("common.view") + " — " + (viewTopic?.title ?? "")}
      >
        {viewTopic && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={viewTopic.status} />
              {viewTopic.internshipType && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {viewTopic.internshipType}
                </span>
              )}
              {viewTopic.type && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                  {viewTopic.type.replace("_", " ")}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-[13px]">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t("teacherTopics.department")}
                </p>
                <p className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                  <GraduationCap className="h-3.5 w-3.5 text-gray-400" />
                  {viewTopic.filiere?.name || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t("teacherTopics.capacity")}
                </p>
                <p className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                  <Users className="h-3.5 w-3.5 text-gray-400" />
                  {viewTopic.maxStudents}{" "}
                  {viewTopic.maxStudents > 1 ? t("teacherTopics.studentsUnit") : t("teacherTopics.studentUnit")}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t("teacherTopics.targetLevels")}
                </p>
                <p className="flex items-center gap-1.5 text-gray-900 dark:text-white">
                  <Layers className="h-3.5 w-3.5 text-gray-400" />
                  {viewTopic.targetLevels || "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t("teacherTopics.proposedBy")}
                </p>
                <p className="text-gray-900 dark:text-white">
                  {viewTopic.proposedBy?.name || "—"}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                {t("teacherTopics.description")}
              </p>
              <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {viewTopic.description || t("teacherTopics.noDescription")}
              </p>
            </div>

            {viewTopic.requiredSkills && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {t("teacherTopics.requiredSkills")}
                </p>
                <p className="text-[13px] text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {viewTopic.requiredSkills}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setViewTopic(null)}>
                {t("common.close")}
              </Button>
              {canCancelRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                  onClick={() => setConfirmAction({ type: "cancel", topic: viewTopic })}
                  isLoading={isApplying === viewTopic.id}
                >
                  {t("teacherTopics.cancelRequest")}
                </Button>
              )}
              {canApply && (
                <Button
                  size="sm"
                  onClick={() => setConfirmAction({ type: "apply", topic: viewTopic })}
                  isLoading={isApplying === viewTopic.id}
                >
                  {t("teacherTopics.apply")}
                </Button>
              )}
              {canRespondToAssignment && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
                    onClick={() => setConfirmAction({ type: "decline", topic: viewTopic })}
                    isLoading={isApplying === viewTopic.id && pendingDecision === "REJECT"}
                    disabled={isApplying === viewTopic.id && pendingDecision !== "REJECT"}
                  >
                    {t("teacherTopics.decline")}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setConfirmAction({ type: "accept", topic: viewTopic })}
                    isLoading={isApplying === viewTopic.id && pendingDecision === "ACCEPT"}
                    disabled={isApplying === viewTopic.id && pendingDecision !== "ACCEPT"}
                  >
                    {t("teacherTopics.accept")}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={runConfirm}
        title={t(
          confirmAction?.type === "cancel"
            ? "teacherTopics.cancelConfirmTitle"
            : confirmAction?.type === "accept"
              ? "teacherTopics.acceptConfirmTitle"
              : confirmAction?.type === "decline"
                ? "teacherTopics.declineConfirmTitle"
                : "teacherTopics.applyConfirmTitle",
        )}
        description={t(
          confirmAction?.type === "cancel"
            ? "teacherTopics.cancelConfirmDesc"
            : confirmAction?.type === "accept"
              ? "teacherTopics.acceptConfirmDesc"
              : confirmAction?.type === "decline"
                ? "teacherTopics.declineConfirmDesc"
                : "teacherTopics.applyConfirmDesc",
        )}
        confirmLabel={t(
          confirmAction?.type === "cancel"
            ? "teacherTopics.cancelRequest"
            : confirmAction?.type === "accept"
              ? "teacherTopics.accept"
              : confirmAction?.type === "decline"
                ? "teacherTopics.decline"
                : "teacherTopics.apply",
        )}
        cancelLabel={t("common.cancel")}
        variant={
          confirmAction?.type === "cancel" || confirmAction?.type === "decline"
            ? "danger"
            : "warning"
        }
      />
    </div>
  );
}
