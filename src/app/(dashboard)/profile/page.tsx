"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Lock, Save, User as UserIcon } from "lucide-react";
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
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
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

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleSave = async () => {
    if (!profile) return;
    
    // Clear previous errors
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (profile.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters.";
    }
    if (!validateEmail(profile.email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error("Please fix the errors before saving.");
      return;
    }

    setIsSavingProfile(true);
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
      if (!res.ok) {
        if (json.error?.includes("email")) {
          setErrors({ email: json.error });
        }
        throw new Error(json.error || "Failed to save profile");
      }
      setProfile(json.data);
      if (updateSession) {
        await updateSession({ user: { ...(session?.user ?? {}), name: json.data.name, email: json.data.email } });
      }
      toast.success(t("toast.profileUpdated"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors.serverError"));
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePasswordUpdate = async () => {
    setErrors({});
    const newErrors: Record<string, string> = {};

    if (!passwords.currentPassword) {
      newErrors.currentPassword = "Current password is required.";
    }
    if (passwords.newPassword.length < 8) {
      newErrors.newPassword = "New password must be at least 8 characters.";
    }
    if (passwords.currentPassword === passwords.newPassword && passwords.currentPassword !== "") {
      newErrors.newPassword = "New password cannot be the same as current.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSavingPassword(true);
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
      if (!res.ok) {
        if (json.error?.toLowerCase().includes("current password")) {
          setErrors({ currentPassword: json.error });
        } else if (json.error?.toLowerCase().includes("new password")) {
          setErrors({ newPassword: json.error });
        }
        throw new Error(json.error || "Failed to change password");
      }
      setPasswords({ currentPassword: "", newPassword: "" });
      toast.success(t("toast.passwordUpdated"));
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to change password");
    } finally {
      setIsSavingPassword(false);
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
        <h1 className="text-[17px] font-semibold text-gray-900">{t("profilePage.title")}</h1>
        <p className="text-[13px] text-gray-500 mt-1">{t("profilePage.subtitle")}</p>
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
                <p className="text-sm font-semibold text-gray-900">{t("profilePage.picture")}</p>
                <p className="text-[12px] text-gray-500 mt-1">{t("profilePage.pictureDesc")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
              {!avatarFile ? (
                <>
                  <input type="file" id="avatar-upload" className="hidden" accept="image/*" onChange={handleAvatarSelect} />
                  <label htmlFor="avatar-upload" className="cursor-pointer inline-flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 h-[36px] px-4 text-[13px] font-medium rounded-md shadow-sm transition-all">
                    {t("profilePage.choosePicture")}
                  </label>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleAvatarUpload} isLoading={isUploadingAvatar}>
                    {t("common.save")}
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
                  {t("profilePage.removePicture")}
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t("profilePage.details")}</h2>
            <p className="text-[12px] text-gray-500 mt-1">{t("profilePage.detailsDesc")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t("common.name")}
              value={profile?.name || ""}
              error={errors.name}
              required
              onChange={(event) => {
                setProfile((prev) => prev ? { ...prev, name: event.target.value } : prev);
                if (errors.name) setErrors(prev => ({ ...prev, name: "" }));
              }}
            />
            <Input
              label={t("common.email")}
              type="email"
              value={profile?.email || ""}
              error={errors.email}
              required
              onChange={(event) => {
                setProfile((prev) => prev ? { ...prev, email: event.target.value } : prev);
                if (errors.email) setErrors(prev => ({ ...prev, email: "" }));
              }}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} isLoading={isSavingProfile}>
              <Save className="h-4 w-4 mr-2" /> {t("common.save")}
            </Button>
          </div>
        </div>


        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{t("profilePage.changePassword")}</h2>
            <p className="text-[12px] text-gray-500 mt-1">{t("profilePage.changePasswordDesc")}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label={t("profilePage.currentPassword")}
              type="password"
              value={passwords.currentPassword}
              error={errors.currentPassword}
              required
              onChange={(event) => {
                setPasswords((prev) => ({ ...prev, currentPassword: event.target.value }));
                if (errors.currentPassword) setErrors(prev => ({ ...prev, currentPassword: "" }));
              }}
            />
            <Input
              label={t("profilePage.newPassword")}
              type="password"
              value={passwords.newPassword}
              error={errors.newPassword}
              required
              onChange={(event) => {
                setPasswords((prev) => ({ ...prev, newPassword: event.target.value }));
                if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: "" }));
              }}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handlePasswordUpdate} isLoading={isSavingPassword}>
              <Lock className="h-4 w-4 mr-2" /> {t("profilePage.updatePassword")}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmRemoveAvatar}
        onClose={() => setShowConfirmRemoveAvatar(false)}
        onConfirm={confirmRemoveAvatar}
        title={t("profilePage.removeConfirmTitle")}
        description={t("profilePage.removeConfirmDesc")}
        confirmLabel={t("common.delete")}
        isLoading={isRemovingAvatar}
      />
    </div>
  );
}
