"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle, XCircle, Clock, BookOpen, User, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { InternshipTypeBadge } from "@/components/ui/InternshipTypeBadge";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface Invitation {
  id: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
  message: string | null;
  expiresAt: string;
  createdAt: string;
  team: {
    members: Array<{
      student: { name: string; email: string };
    }>;
  };
}

export default function InvitationsPage() {
  const { data: session } = useSession();
  const { t, isRTL } = useTranslation();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/teams/invitations");
      const data = await res.json();
      setInvitations(data.data || []);
    } catch {
      toast.error(t("toast.loadInvitationsFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const respond = async (invitationId: string, accept: boolean) => {
    setResponding(invitationId);
    try {
      const res = await fetch(`/api/teams/invitations/${invitationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept, comment: "" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success(result.message);
      fetchInvitations();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to respond");
    } finally {
      setResponding(null);
    }
  };

  const pendingInvitations = invitations.filter((i) => i.status === "PENDING");
  const pastInvitations = invitations.filter((i) => i.status !== "PENDING");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-600" />
          {t("invitationsPage.title")}
        </h1>
        <p className="text-[13px] text-gray-500 mt-1">
          {t("invitationsPage.subtitle")}
        </p>
      </div>

      {/* Pending */}
      <div className="space-y-3">
        <h2 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider">
          {t("invitationsPage.pending", { count: pendingInvitations.length })}
        </h2>

        {isLoading ? (
          <div className="text-center py-10 text-gray-400 text-[13px]">
            {t("common.loading")}
          </div>
        ) : pendingInvitations.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-[13px] text-gray-400">
            {t("invitationsPage.noPending")}
          </div>
        ) : (
          pendingInvitations.map((inv) => (
            <div
              key={inv.id}
              className="bg-white border border-indigo-200 rounded-lg p-5 shadow-sm space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Users className="h-4 w-4 text-indigo-500" />
                    <span className="text-[14px] font-medium text-gray-900">
                      Team Invitation
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-gray-500">
                    <User className="h-3.5 w-3.5" />
                    <span>
                      {t("invitationsPage.from", { name: inv.team.members[0]?.student.name })}
                      {" "}({inv.team.members[0]?.student.email})
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-amber-600 bg-amber-50 border border-amber-200 px-2 py-1 rounded">
                  <Clock className="h-3 w-3" />
                  {t("invitationsPage.expires", { date: formatDistanceToNow(new Date(inv.expiresAt), { addSuffix: true }) })}
                </div>
              </div>

              {inv.message && (
                <div className="bg-gray-50 border border-gray-100 rounded p-3 text-[12px] text-gray-600 italic">
                  &ldquo;{inv.message}&rdquo;
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  size="sm"
                  onClick={() => respond(inv.id, true)}
                  isLoading={responding === inv.id}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  {t("invitationsPage.accept")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respond(inv.id, false)}
                  isLoading={responding === inv.id}
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  <XCircle className="h-4 w-4 mr-1.5" />
                  {t("invitationsPage.decline")}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Past invitations */}
      {pastInvitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[13px] font-semibold text-gray-700 uppercase tracking-wider">
            {t("invitationsPage.history")}
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {pastInvitations.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-gray-800">
                    Team Invitation
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {format(new Date(inv.createdAt), "MMM d, yyyy")} ·{" "}
                    {inv.team.members[0]?.student.name}
                  </p>
                </div>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded uppercase ${
                    inv.status === "ACCEPTED"
                      ? "bg-emerald-100 text-emerald-700"
                      : inv.status === "REJECTED"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {t(`status.${inv.status}` as any)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
