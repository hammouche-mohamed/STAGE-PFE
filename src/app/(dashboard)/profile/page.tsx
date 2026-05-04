"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Lock, Save, User as UserIcon, Languages, Check } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { Language } from "@/lib/i18n/translations";

type ProfileData = {
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [showConfirmRemoveAvatar, setShowConfirmRemoveAvatar] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "" });
  const { data: session, update: updateSession } = useSession();
  const { t, language, setLanguage, isRTL } = useTranslation();

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", avatarFile);

      const res = await fetch("/api/upload/avatar", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      setAvatarFile(null);
      setAvatarPreview(null);
      setProfile((prev) => (prev ? { ...prev, avatarUrl: result.url } : prev));
      if (updateSession) {
        await updateSession({ user: { ...(session?.user ?? {}), image: result.url } });
      }
      toast.success(t("toast.profilePictureUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.serverError"));
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const json = await res.json();
      if (json.data) setProfile(json.data);
    } catch (error) {
      console.error(error);
      toast.error(t("toast.loadProfileFailed"));
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchProfile().finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save profile");
      setProfile(json.data);
      if (updateSession) {
        await updateSession({ user: { ...(session?.user ?? {}), name: json.data.name, email: json.data.email } });
      }
      toast.success(t("toast.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.serverError"));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwords.currentPassword || !passwords.newPassword) {
      toast.error(t("toast.fillBothPasswords"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to change password");
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success(t("toast.passwordUpdated"));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to change password");
    } finally {
      setSaving(false);
    }
  };



  const confirmRemoveAvatar = async () => {
    if (!profile?.avatarUrl) return;
    setIsRemovingAvatar(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl: null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to remove profile picture");
      setProfile(json.data);
      
      if (updateSession) {
        await updateSession({ user: { ...(session?.user ?? {}), image: null } });
      }
      
      toast.success(t("toast.profilePictureRemoved"));
      setShowConfirmRemoveAvatar(false);
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to remove profile picture");
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  return (
    <div className="max-w-[860px] space-y-8">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900">My Profile</h1>
        <p className="text-[13px] text-gray-500 mt-1">Upload a profile picture, update your account information, and change your password.</p>
      </div>

      <div className="grid gap-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center text-[24px] font-semibold text-gray-500">
                {avatarPreview || profile?.avatarUrl ? (
                  <img src={avatarPreview || profile?.avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" />
                ) : (
                  <UserIcon className="h-7 w-7" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Profile picture</p>
                <p className="text-[12px] text-gray-500 mt-1">Upload a photo to personalize your account.</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              {!avatarFile ? (
                <>
                  <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                  <label htmlFor="avatar-upload" className="cursor-pointer inline-flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 h-[36px] px-4 text-[13px] font-medium rounded-md shadow-sm transition-all">
                    Choose picture
                  </label>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAvatarUpload} isLoading={isUploadingAvatar}>
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAvatarFile(null); setAvatarPreview(null); }} disabled={isUploadingAvatar}>
                    Cancel
                  </Button>
                </div>
              )}
              {profile?.avatarUrl && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmRemoveAvatar(true)}
                >
                  Remove picture
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Account details</h2>
            <p className="text-[12px] text-gray-500 mt-1">Your name and email are used for login and notification delivery.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Full name"
              value={profile?.name || ""}
              onChange={(event) => setProfile((prev) => prev ? { ...prev, name: event.target.value } : prev)}
            />
            <Input
              label="Email address"
              type="email"
              value={profile?.email || ""}
              onChange={(event) => setProfile((prev) => prev ? { ...prev, email: event.target.value } : prev)}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={saving}>
              <Save className="h-4 w-4 mr-2" /> Save changes
            </Button>
          </div>
        </div>

        {/* Language Selection */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <Languages className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-gray-900">Language Preference</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { code: "en", name: "English", flag: "🇺🇸" },
              { code: "fr", name: "Français", flag: "🇫🇷" },
              { code: "ar", name: "العربية", flag: "🇩🇿" },
            ].map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLanguage(lang.code as Language)}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  language === lang.code
                    ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-50"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{lang.flag}</span>
                <div className="flex-1 text-left">
                  <p className={`text-[13px] font-bold ${language === lang.code ? "text-indigo-900" : "text-gray-700"}`}>
                    {lang.name}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">{lang.code}</p>
                </div>
                {language === lang.code && (
                  <Check className="h-4 w-4 text-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Change password</h2>
            <p className="text-[12px] text-gray-500 mt-1">Update your account password to protect your profile.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Current password"
              type="password"
              value={passwords.currentPassword}
              onChange={(event) => setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }))}
            />
            <Input
              label="New password"
              type="password"
              value={passwords.newPassword}
              onChange={(event) => setPasswords((prev) => ({ ...prev, newPassword: event.target.value }))}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePasswordUpdate} isLoading={saving}>
              <Lock className="h-4 w-4 mr-2" /> Update password
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmRemoveAvatar}
        onClose={() => setShowConfirmRemoveAvatar(false)}
        onConfirm={confirmRemoveAvatar}
        title="Remove Profile Picture"
        description="Are you sure you want to remove your profile picture? This will reset your avatar to the default icon."
        confirmLabel="Remove"
        isLoading={isRemovingAvatar}
      />
    </div>
  );
}
