"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, UserPlus, LogOut, CheckCircle2, AlertCircle, Trash2, Mail, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function StudentTeamPage() {
  const { data: session } = useSession();
  const { t, isRTL } = useTranslation();
  const [team, setTeam] = useState<any>(null);
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  // Per-row loading so only the clicked Invite / cancel button spins.
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: "invite" | "cancel";
    id: string;
    name: string;
  } | null>(null);
  const [leaveReason, setLeaveReason] = useState("");
  
  // Create Team state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createReason, setCreateReason] = useState("");

  // Invite Students table: search + level filter
  const [inviteSearch, setInviteSearch] = useState("");
  const [inviteLevel, setInviteLevel] = useState("ALL");

  const inviteLevels = useMemo(
    () =>
      Array.from(
        new Set(
          availableStudents.map((s) => s.level).filter(Boolean) as string[],
        ),
      ).sort(),
    [availableStudents],
  );

  const filteredAvailable = useMemo(() => {
    const q = inviteSearch.trim().toLowerCase();
    return availableStudents.filter((s) => {
      const matchesLevel = inviteLevel === "ALL" || s.level === inviteLevel;
      const matchesSearch =
        !q ||
        s.user?.name?.toLowerCase().includes(q) ||
        s.user?.email?.toLowerCase().includes(q);
      return matchesLevel && matchesSearch;
    });
  }, [availableStudents, inviteSearch, inviteLevel]);

  // `silent` skips the full-page loading state so post-action refreshes
  // (invite / cancel / create) update in place instead of blanking the page.
  const fetchTeam = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setIsLoading(true);
    try {
      const res = await fetch("/api/teams");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || t("studentTeam.toastLoadFailed"));
        setTeam(null);
        return;
      }
      setTeam(json.data || null);
    } catch (err) {
      console.error("fetchTeam error:", err);
      toast.error(t("studentTeam.toastNetwork"));
    } finally {
      if (!opts?.silent) setIsLoading(false);
    }
  };

  const fetchAvailableStudents = async () => {
    try {
      const res = await fetch("/api/students/available");
      const data = await res.json();
      setAvailableStudents(data.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchAvailableStudents();
  }, []);

  const handleCreateTeam = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: createReason })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("studentTeam.toastCreated"));
      setShowCreateTeam(false);
      fetchTeam({ silent: true });
    } catch (e: any) {
      toast.error(e.message || t("studentTeam.toastCreateFailed"));
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleInvite = async (studentId: string) => {
    setInvitingId(studentId);
    const invited = availableStudents.find((s) => s.userId === studentId);
    try {
      const res = await fetch("/api/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, teamId: team.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(t("studentTeam.toastInvited"));
      // Update in place — no full-page refresh: drop the invited student
      // from the list and add them to Pending Invitations optimistically.
      if (invited) {
        setAvailableStudents((prev) => prev.filter((s) => s.userId !== studentId));
        setTeam((prev: any) =>
          prev
            ? {
                ...prev,
                invitations: [
                  ...(prev.invitations ?? []),
                  {
                    id: json.data?.id ?? `tmp-${studentId}`,
                    status: "PENDING",
                    invitedStudent: {
                      name: invited.user?.name ?? "",
                      email: invited.user?.email ?? "",
                      level: invited.level ?? null,
                    },
                  },
                ],
              }
            : prev
        );
      }
    } catch (e: any) {
      toast.error(e.message || t("studentTeam.toastInviteFailed"));
    } finally {
      setInvitingId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    setCancelingInvitationId(invitationId);
    try {
      const res = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("studentTeam.toastInvitationCancelled", { defaultValue: "Invitation cancelled." }));
      // Remove it from the list in place, then resync quietly.
      setTeam((prev: any) =>
        prev
          ? { ...prev, invitations: (prev.invitations ?? []).filter((i: any) => i.id !== invitationId) }
          : prev
      );
      fetchTeam({ silent: true });
      fetchAvailableStudents();
    } catch (e: any) {
      toast.error(e.message || t("studentTeam.toastInviteFailed"));
    } finally {
      setCancelingInvitationId(null);
    }
  };

  const handleLeaveTeam = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/teams/members/${team.id}?comment=${encodeURIComponent(leaveReason)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("studentTeam.toastLeft"));
      setTeam(null);
      setLeaveConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.message || t("studentTeam.toastLeaveFailed"));
    } finally {
      setIsActionLoading(false);
    }
  };

  const isLeader = team?.leaderId === session?.user?.id;

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">{t("studentTeam.loading")}</div>;
  }

  if (!team) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            {t("studentTeam.title")}
          </h1>
          <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
            {t("studentTeam.notInTeam")}
          </p>
        </div>

        {!showCreateTeam ? (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 text-center">
            <div className="h-16 w-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-white mb-2">{t("studentTeam.createTitle")}</h2>
            <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">
              {t("studentTeam.createDesc")}
            </p>
            <Button onClick={() => setShowCreateTeam(true)} className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              {t("studentTeam.startTeam")}
            </Button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white mb-4">{t("studentTeam.teamDetails")}</h2>
            <div className="space-y-4">
              <div>
                <label className="admin-form-label">{t("studentTeam.reasonLabel")}</label>
                <textarea 
                  className="admin-input h-24 py-2" 
                  placeholder={t("studentTeam.reasonPlaceholder")}
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowCreateTeam(false)}>{t("common.cancel")}</Button>
                <Button onClick={handleCreateTeam} isLoading={isActionLoading}>{t("studentTeam.createTeam")}</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          {t("studentTeam.title")}
        </h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">
          {t("studentTeam.manageDesc")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Members List */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {t("studentTeam.teamMembers")}
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] rounded-full">
                  {team.members.length}
                </span>
              </h2>
              {team.reason && (
                <span className="text-[11px] text-gray-500 dark:text-gray-400 italic">"{team.reason}"</span>
              )}
            </div>
            <div className="divide-y divide-gray-50 dark:divide-slate-800">
              {team.members.map((m: any) => (
                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center font-bold text-indigo-600 dark:text-indigo-400">
                      {m.student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-gray-900 dark:text-white flex items-center gap-2">
                        {m.student.name}
                        {m.isLeader && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-sm font-bold uppercase tracking-wider">
                            {t("studentTeam.leader")}
                          </span>
                        )}
                        {m.studentId === session?.user?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 rounded-sm">{t("studentTeam.you")}</span>
                        )}
                        {m.student.level && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-sm font-bold">{m.student.level}</span>
                        )}
                      </p>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{m.student.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Actions — stretches to match the Team Members card and
            fills the space with at-a-glance team info above the action. */}
        <div className="h-full">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-5 shadow-sm h-full flex flex-col">
            <h3 className="text-[13px] font-bold text-gray-900 dark:text-white mb-4">{t("studentTeam.actions")}</h3>

            <dl className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">{t("studentTeam.membersCount")}</dt>
                <dd className="font-semibold text-gray-900 dark:text-white">{team.members.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-gray-500 dark:text-gray-400">{t("studentTeam.yourRole")}</dt>
                <dd>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                    isLeader
                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                      : "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                  }`}>
                    {isLeader ? t("studentTeam.leader") : t("studentTeam.member")}
                  </span>
                </dd>
              </div>
              {team.academicYear && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500 dark:text-gray-400">{t("studentTeam.academicYear")}</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">{team.academicYear}</dd>
                </div>
              )}
              {team.reason && (
                <div className="pt-1">
                  <dt className="text-gray-500 dark:text-gray-400 mb-1">{t("studentTeam.teamNote")}</dt>
                  <dd className="text-[12px] text-gray-700 dark:text-gray-300 italic bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 rounded-md p-2.5 whitespace-pre-wrap break-words">
                    "{team.reason}"
                  </dd>
                </div>
              )}
            </dl>

            <Button
              variant="outline"
              className="w-full justify-start mt-auto pt-2 text-red-600 hover:text-red-700 dark:hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30"
              onClick={() => setLeaveConfirmOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("studentTeam.leaveTeam")}
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Invitations — full-width table, below Team Members + Actions */}
      {team.invitations.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/30 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-amber-100 dark:border-amber-900/20 bg-amber-50/30 dark:bg-amber-900/10 flex items-center gap-2">
            <h2 className="text-[14px] font-bold text-amber-900 dark:text-amber-400">{t("studentTeam.pendingInvitations")}</h2>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] rounded-full">
              {team.invitations.length}
            </span>
          </div>
          <div className="admin-table-container !border-0 !rounded-none !shadow-none !min-h-0 !p-0 !bg-transparent overflow-x-hidden [&_td]:!px-4 [&_th]:!px-4 [&_td]:!py-3 [&_table]:!-mt-2">
            <table className="admin-table table-fixed">
              <colgroup>
                <col className="w-[30%]" />
                <col className="w-[34%]" />
                <col className="w-[12%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
              </colgroup>
              <thead className="admin-table-header">
                <tr>
                  <th>{t("common.name", { defaultValue: "Name" })}</th>
                  <th>{t("common.email", { defaultValue: "Email" })}</th>
                  <th>{t("studentTeam.level", { defaultValue: "Level" })}</th>
                  <th>{t("common.status", { defaultValue: "Status" })}</th>
                  <th className="text-right">{t("common.actions", { defaultValue: "Action" })}</th>
                </tr>
              </thead>
              <tbody>
                {team.invitations.map((inv: any) => (
                  <tr key={inv.id} className="admin-table-row">
                    <td className="font-medium text-gray-900 dark:text-white truncate">{inv.invitedStudent.name}</td>
                    <td className="text-gray-500 dark:text-gray-400 truncate">{inv.invitedStudent.email}</td>
                    <td>
                      {inv.invitedStudent.level ? (
                        <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-sm font-bold">{inv.invitedStudent.level}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <span className="text-[10px] px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-semibold whitespace-nowrap">
                        {t("studentTeam.awaitingReply")}
                      </span>
                    </td>
                    <td className="text-right">
                      {isLeader && (
                        <button
                          onClick={() => setPendingConfirm({ kind: "cancel", id: inv.id, name: inv.invitedStudent?.name || "" })}
                          disabled={cancelingInvitationId === inv.id}
                          title={t("studentTeam.cancelInvitation", { defaultValue: "Cancel invitation" })}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invite Students — full-width table with search + level filter */}
      {isLeader && (
        <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-900/30 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-indigo-100 dark:border-indigo-900/20 bg-indigo-50/50 dark:bg-indigo-900/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-[14px] font-bold text-indigo-900 dark:text-indigo-400 flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {t("studentTeam.inviteStudents")}
              <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-[10px] rounded-full">
                {filteredAvailable.length}
              </span>
            </h3>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t("common.search", { defaultValue: "Search name or email…" })}
                  className="admin-input pl-9 h-9 text-[13px] w-full sm:w-64"
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                />
              </div>
              <select
                className="admin-input h-9 text-[13px] w-full sm:w-36"
                value={inviteLevel}
                onChange={(e) => setInviteLevel(e.target.value)}
              >
                <option value="ALL">{t("common.all", { defaultValue: "All levels" })}</option>
                {inviteLevels.map((lv) => (
                  <option key={lv} value={lv}>{lv}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="admin-table-container !border-0 !rounded-none !shadow-none !min-h-0 !p-0 !bg-transparent overflow-x-hidden overflow-y-auto max-h-[492px] [&_td]:!px-4 [&_th]:!px-4 [&_td]:!py-3 [&_table]:!-mt-2 [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead_th]:bg-gray-50 dark:[&_thead_th]:bg-slate-950">
            <table className="admin-table table-fixed">
              <colgroup>
                <col className="w-[34%]" />
                <col className="w-[38%]" />
                <col className="w-[12%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="admin-table-header">
                <tr>
                  <th>{t("common.name", { defaultValue: "Name" })}</th>
                  <th>{t("common.email", { defaultValue: "Email" })}</th>
                  <th>{t("studentTeam.level", { defaultValue: "Level" })}</th>
                  <th className="text-right">{t("common.actions", { defaultValue: "Action" })}</th>
                </tr>
              </thead>
              <tbody>
                {filteredAvailable.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400 dark:text-gray-500">
                      {t("common.noData", { defaultValue: "No students found." })}
                    </td>
                  </tr>
                ) : (
                  filteredAvailable.map((s) => (
                    <tr key={s.id} className="admin-table-row">
                      <td className="font-medium text-gray-900 dark:text-white truncate">{s.user.name}</td>
                      <td className="text-gray-500 dark:text-gray-400 truncate">{s.user.email}</td>
                      <td>
                        {s.level ? (
                          <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-sm font-bold">{s.level}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="text-right">
                        <Button
                          size="sm"
                          className="text-[11px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => setPendingConfirm({ kind: "invite", id: s.userId, name: s.user?.name || "" })}
                          isLoading={invitingId === s.userId}
                          disabled={invitingId === s.userId}
                        >
                          <Mail className="h-3 w-3 mr-1.5" /> {t("studentTeam.invite")}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={handleLeaveTeam}
        title={t("studentTeam.leaveTeam")}
        description={t("studentTeam.leaveConfirmDesc")}
        confirmLabel={t("studentTeam.leaveTeam")}
        cancelLabel={t("common.cancel")}
        variant="danger"
      >
        <div className="mt-4">
          <label className="text-[12px] font-semibold text-gray-700 mb-1 block">{t("studentTeam.leaveReasonLabel")}</label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-2 text-[13px]"
            rows={3}
            placeholder={t("studentTeam.leaveReasonPlaceholder")}
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        isOpen={!!pendingConfirm}
        onClose={() => setPendingConfirm(null)}
        onConfirm={() => {
          if (!pendingConfirm) return;
          const { kind, id } = pendingConfirm;
          setPendingConfirm(null);
          if (kind === "invite") handleInvite(id);
          else handleCancelInvitation(id);
        }}
        title={
          pendingConfirm?.kind === "cancel"
            ? t("studentTeam.confirmCancelTitle")
            : t("studentTeam.confirmInviteTitle")
        }
        description={
          pendingConfirm?.kind === "cancel"
            ? t("studentTeam.confirmCancelDesc", { name: pendingConfirm?.name })
            : t("studentTeam.confirmInviteDesc", { name: pendingConfirm?.name })
        }
        confirmLabel={
          pendingConfirm?.kind === "cancel"
            ? t("studentTeam.cancelInvitation")
            : t("studentTeam.invite")
        }
        cancelLabel={t("common.cancel")}
        variant={pendingConfirm?.kind === "cancel" ? "danger" : "warning"}
      />
    </div>
  );
}
