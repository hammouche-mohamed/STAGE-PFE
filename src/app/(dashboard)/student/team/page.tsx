"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Users, UserPlus, LogOut, CheckCircle2, AlertCircle, Trash2, Mail } from "lucide-react";
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
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [leaveReason, setLeaveReason] = useState("");
  
  // Create Team state
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [createReason, setCreateReason] = useState("");

  const fetchTeam = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/teams");
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to load team info");
        setTeam(null);
        return;
      }
      setTeam(json.data || null);
    } catch (err) {
      console.error("fetchTeam error:", err);
      toast.error("Network error while loading team");
    } finally {
      setIsLoading(false);
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
      toast.success("Team created successfully");
      fetchTeam();
      setShowCreateTeam(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to create team");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleInvite = async (studentId: string) => {
    setIsActionLoading(true);
    try {
      const res = await fetch("/api/teams/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, teamId: team.id })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Invitation sent");
      fetchTeam();
    } catch (e: any) {
      toast.error(e.message || "Failed to invite student");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    setIsActionLoading(true);
    try {
      const res = await fetch(`/api/teams/members/${team.id}?comment=${encodeURIComponent(leaveReason)}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("You have left the team");
      setTeam(null);
      setLeaveConfirmOpen(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to leave team");
    } finally {
      setIsActionLoading(false);
    }
  };

  const isLeader = team?.leaderId === session?.user?.id;

  if (isLoading) {
    return <div className="py-12 text-center text-gray-500">Loading...</div>;
  }

  if (!team) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-5 w-5 text-indigo-600" />
            My Team
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            You are not part of any team yet.
          </p>
        </div>

        {!showCreateTeam ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="h-16 w-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-indigo-500" />
            </div>
            <h2 className="text-[15px] font-bold text-gray-900 mb-2">Create a New Team</h2>
            <p className="text-[13px] text-gray-500 mb-6">
              Form a team to start working on your PFE. You will be the leader and can invite other students.
            </p>
            <Button onClick={() => setShowCreateTeam(true)} className="px-8 bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Start a Team
            </Button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-[14px] font-bold text-gray-900 mb-4">Team Details</h2>
            <div className="space-y-4">
              <div>
                <label className="admin-form-label">Motivation / Reason for team (Optional)</label>
                <textarea 
                  className="admin-input h-24 py-2" 
                  placeholder="E.g., We want to work on AI projects together..."
                  value={createReason}
                  onChange={(e) => setCreateReason(e.target.value)}
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <Button variant="outline" onClick={() => setShowCreateTeam(false)}>Cancel</Button>
                <Button onClick={handleCreateTeam} isLoading={isActionLoading}>Create Team</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-600" />
          My Team
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          Manage your team members and invitations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Members List */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-gray-900 flex items-center gap-2">
                Team Members
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] rounded-full">
                  {team.members.length}
                </span>
              </h2>
              {team.reason && (
                <span className="text-[11px] text-gray-500 italic">"{team.reason}"</span>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {team.members.map((m: any) => (
                <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600">
                      {m.student.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-[14px] font-medium text-gray-900 flex items-center gap-2">
                        {m.student.name}
                        {m.isLeader && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-sm font-bold uppercase tracking-wider">
                            Leader
                          </span>
                        )}
                        {m.studentId === session?.user?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-sm">You</span>
                        )}
                      </p>
                      <p className="text-[12px] text-gray-500">{m.student.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations */}
          {team.invitations.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-3 border-b border-amber-100 bg-amber-50/30">
                <h2 className="text-[13px] font-bold text-amber-900">Pending Invitations</h2>
              </div>
              <div className="divide-y divide-amber-50">
                {team.invitations.map((inv: any) => (
                  <div key={inv.id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900">{inv.invitedStudent.name}</p>
                      <p className="text-[11px] text-gray-500">{inv.invitedStudent.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold">
                      Awaiting Reply
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-900 mb-4">Actions</h3>
            <Button 
              variant="outline" 
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => setLeaveConfirmOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Team
            </Button>
          </div>

          {isLeader && availableStudents.length > 0 && (
            <div className="bg-white border border-indigo-200 rounded-xl overflow-hidden shadow-sm">
              <div className="px-5 py-3 border-b border-indigo-100 bg-indigo-50/50">
                <h3 className="text-[13px] font-bold text-indigo-900">Invite Students</h3>
              </div>
              <div className="p-2 max-h-[300px] overflow-y-auto divide-y divide-gray-50">
                {availableStudents.map((s) => (
                  <div key={s.id} className="p-3 flex flex-col gap-2 hover:bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-[13px] font-medium text-gray-900 truncate">{s.user.name}</p>
                      <p className="text-[11px] text-gray-500 truncate">{s.user.email}</p>
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full text-[11px] h-7 bg-indigo-600 hover:bg-indigo-700 text-white"
                      onClick={() => handleInvite(s.userId)}
                      isLoading={isActionLoading}
                    >
                      <Mail className="h-3 w-3 mr-1.5" /> Invite
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={leaveConfirmOpen}
        onClose={() => setLeaveConfirmOpen(false)}
        onConfirm={handleLeaveTeam}
        title="Leave Team"
        description="Are you sure you want to leave this team? If you are the leader, leadership will be automatically transferred. If no members are left, the team will be deleted."
        confirmLabel="Leave Team"
        cancelLabel="Cancel"
        variant="danger"
      >
        <div className="mt-4">
          <label className="text-[12px] font-semibold text-gray-700 mb-1 block">Reason for leaving (Required)</label>
          <textarea
            className="w-full border border-gray-300 rounded-md p-2 text-[13px]"
            rows={3}
            placeholder="Explain why you are leaving..."
            value={leaveReason}
            onChange={(e) => setLeaveReason(e.target.value)}
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}
