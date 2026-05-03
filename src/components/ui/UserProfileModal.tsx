"use client";

import React, { useEffect, useState } from "react";
import { X, Mail, GraduationCap, Building2, Briefcase, User } from "lucide-react";
import Image from "next/image";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  level?: string | null;
  avatarUrl?: string | null;
  studentProfile?: { speciality?: string | null; promotion?: string | null; academicYear?: string | null } | null;
  teacherProfile?: { speciality?: string | null; grade?: string | null; maxStudents?: number | null } | null;
  companyProfile?: { companyName?: string | null; sector?: string | null; wilaya?: string | null; contactPhone?: string | null } | null;
}

interface UserProfileModalProps {
  userId: string | null;
  onClose: () => void;
}

const roleColors: Record<string, string> = {
  STUDENT: "bg-indigo-100 text-indigo-700",
  TEACHER: "bg-emerald-100 text-emerald-700",
  COMPANY: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
};

const roleLabels: Record<string, string> = {
  STUDENT: "Student",
  TEACHER: "Supervisor",
  COMPANY: "Company",
  ADMIN: "Admin",
};

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch(`/api/users/${userId}/profile`)
      .then((r) => r.json())
      .then((d) => setProfile(d.data || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [userId]);

  if (!userId) return null;

  const initials = profile?.name
    ? profile.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header gradient */}
        <div className="h-20 bg-gradient-to-br from-indigo-500 to-purple-600 relative">
          <button
            onClick={onClose}
            className="absolute top-3 right-3 h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center -mt-10 mb-3">
          <div className="h-20 w-20 rounded-full border-4 border-white shadow-lg overflow-hidden bg-indigo-100 flex items-center justify-center">
            {profile?.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.name}
                width={80}
                height={80}
                className="object-cover w-full h-full"
                unoptimized
              />
            ) : (
              <span className="text-[22px] font-bold text-indigo-700">{initials}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="px-6 pb-8 text-center text-gray-400 text-[13px]">Loading profile…</div>
        ) : !profile ? (
          <div className="px-6 pb-8 text-center text-gray-400 text-[13px]">Profile not found</div>
        ) : (
          <div className="px-6 pb-6 space-y-4">
            {/* Name + role */}
            <div className="text-center">
              <h2 className="text-[17px] font-bold text-gray-900">{profile.name}</h2>
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${roleColors[profile.role] ?? "bg-gray-100 text-gray-600"}`}>
                {roleLabels[profile.role] ?? profile.role}
              </span>
              {profile.level && (
                <span className="ml-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-500 uppercase">
                  {profile.level}
                </span>
              )}
            </div>

            {/* Info rows */}
            <div className="space-y-2.5 border-t border-gray-100 pt-4">
              <div className="flex items-center gap-3 text-[13px]">
                <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <a href={`mailto:${profile.email}`} className="text-indigo-600 hover:underline truncate">
                  {profile.email}
                </a>
              </div>

              {/* Student details */}
              {profile.studentProfile && (
                <>
                  {profile.studentProfile.speciality && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <GraduationCap className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.studentProfile.speciality}
                    </div>
                  )}
                  {profile.studentProfile.promotion && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.studentProfile.promotion}
                    </div>
                  )}
                </>
              )}

              {/* Teacher details */}
              {profile.teacherProfile && (
                <>
                  {profile.teacherProfile.grade && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <GraduationCap className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.teacherProfile.grade}
                    </div>
                  )}
                  {profile.teacherProfile.speciality && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.teacherProfile.speciality}
                    </div>
                  )}
                </>
              )}

              {/* Company details */}
              {profile.companyProfile && (
                <>
                  {profile.companyProfile.companyName && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.companyProfile.companyName}
                      {profile.companyProfile.sector && (
                        <span className="text-gray-400">· {profile.companyProfile.sector}</span>
                      )}
                    </div>
                  )}
                  {profile.companyProfile.wilaya && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <Briefcase className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      {profile.companyProfile.wilaya}
                    </div>
                  )}
                  {profile.companyProfile.contactPhone && (
                    <div className="flex items-center gap-3 text-[13px] text-gray-600">
                      <span className="h-4 w-4 text-gray-400 flex-shrink-0">📞</span>
                      {profile.companyProfile.contactPhone}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
