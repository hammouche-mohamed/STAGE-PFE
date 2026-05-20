"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Settings, Lock, Unlock, Calendar, Palette, FileText, Trash2, Users } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export default function AdminSettingsPage() {
  const router = useRouter();
  const { t, isRTL } = useTranslation();
  const { data: session, status } = useSession();

  // All hooks must be declared unconditionally (Rules of Hooks)
  const [settings, setSettings] = useState({
    currentAcademicYear: "",
    registrationOpen: "false",
    maxResubmissions: "3",
    universityLogo: "",
    availableSpecialities: "",
    availablePromotions: "",
    proposalFormTemplateUrl: "",
    MAX_TEAM_SIZE: "2",
    pfeEndDate: "",
  });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [brandingFile, setBrandingFile] = useState<File | null>(null);
  const [brandingPreview, setBrandingPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);
  const [showLogoDeleteConfirm, setShowLogoDeleteConfirm] = useState(false);
  const [showTemplateDeleteConfirm, setShowTemplateDeleteConfirm] = useState(false);
  const [showAcademicYearDeleteConfirm, setShowAcademicYearDeleteConfirm] = useState(false);
  const [archiveOldYear, setArchiveOldYear] = useState<string | null>(null);
  const [evictionYear, setEvictionYear] = useState<string | null>(null);
  const [isArchivingYear, setIsArchivingYear] = useState(false);
  const [yearStart, setYearStart] = useState<string>("");
  const [yearEnd, setYearEnd] = useState<string>("");
  const [pfeTeamSize, setPfeTeamSize] = useState<string>("2");

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (data.data) {
        const settingMap = data.data.reduce((acc: any, curr: any) => {
          acc[curr.key] = curr.value;
          return acc;
        }, {});
        setSettings(prev => ({ ...prev, ...settingMap }));
        setPfeTeamSize(String(settingMap.MAX_TEAM_SIZE ?? "2"));
        if (settingMap.currentAcademicYear && settingMap.currentAcademicYear.includes("-")) {
          const [start, end] = settingMap.currentAcademicYear.split("-");
          setYearStart(start || "");
          setYearEnd(end || "");
        } else {
          setYearStart("");
          setYearEnd("");
        }
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    if (key === "currentAcademicYear" && value !== "-") {
      const [start, end] = value.split("-");
      const startNum = parseInt(start);
      const endNum = parseInt(end);
      
      if (start && (startNum < 2000 || startNum > 2099)) {
        toast.error("Start year must be between 2000 and 2099");
        return false;
      }
      if (end && (endNum < 2000 || endNum > 2099)) {
        toast.error("End year must be between 2000 and 2099");
        return false;
      }
      if (start && end && startNum >= endNum) {
        toast.error("End year must be after start year");
        return false;
      }
    }

    setLoadingKey(key);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error + (result.message ? `: ${result.message}` : "") || "Update failed");
      }
      
      toast.success(`${key} updated successfully`);
      await fetchSettings();
      return true;
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update setting");
      return false;
    } finally {
      setLoadingKey(null);
    }
    return false;
  };

  const handleDeleteTemplate = async () => {
    await handleUpdate("proposalFormTemplateUrl", "");
    setShowTemplateDeleteConfirm(false);
  };

  const handleDeleteLogo = async () => {
    await handleUpdate("universityLogo", "");
    setShowLogoDeleteConfirm(false);
    router.refresh();
  };

  const handleDeleteAcademicYear = async () => {
    await handleUpdate("currentAcademicYear", "");
    setYearStart("");
    setYearEnd("");
    setShowAcademicYearDeleteConfirm(false);
  };

  // Changing the academic year is the trigger for archiving. After the new
  // year is saved, prompt the Super Admin to archive the previous year's
  // topics + internships (the only path to the Archives view).
  const handleAcademicYearUpdate = async () => {
    const prevYear = settings.currentAcademicYear;
    const newYear = `${yearStart}-${yearEnd}`;
    const ok = await handleUpdate("currentAcademicYear", newYear);
    if (
      ok &&
      prevYear &&
      prevYear !== "N/A" &&
      /^\d{4}-\d{4}$/.test(prevYear) &&
      prevYear !== newYear
    ) {
      // Ask the server which (if any) older year would be pushed into the
      // 3-day permanent-deletion countdown, so we can warn before archiving.
      try {
        const r = await fetch(
          `/api/admin/archives/status?preview=${encodeURIComponent(prevYear)}`,
        );
        const d = await r.json();
        setEvictionYear(r.ok ? (d?.preview?.evictedYear ?? null) : null);
      } catch {
        setEvictionYear(null);
      }
      setArchiveOldYear(prevYear);
    }
  };

  const confirmArchiveYear = async () => {
    if (!archiveOldYear) return;
    setIsArchivingYear(true);
    try {
      const res = await fetch("/api/admin/archives/year", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year: archiveOldYear }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Archive failed");
      toast.success(result.message || `Archived ${archiveOldYear}.`);
      if (result.evictedYear && result.scheduledDeleteAt) {
        toast.warning(
          `${result.evictedYear} will be PERMANENTLY DELETED on ` +
            `${new Date(result.scheduledDeleteAt).toLocaleDateString()}. ` +
            `Download it now from Archives.`,
          { duration: 10000 },
        );
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to archive the previous year.");
    } finally {
      setIsArchivingYear(false);
      setArchiveOldYear(null);
      setEvictionYear(null);
    }
  };

  // NFR-S2: client-side role guard — redirect non-admins immediately
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !session.user.isSuperAdmin) {
      router.replace("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Block render until session is confirmed
  if (status === "loading" || !session || !session.user.isSuperAdmin) {
    return <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">Verifying access…</div>;
  }

  const handleBrandingSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBrandingFile(file);
      setBrandingPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!brandingFile) return;
    setIsUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", brandingFile);

      const res = await fetch("/api/upload/logo", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      toast.success("University logo updated successfully");
      setBrandingFile(null);
      setBrandingPreview(null);
      await fetchSettings();
      router.refresh(); // Crucial: forces the Layout (Sidebar) to refetch the logo from DB
    } catch (error: any) {
      toast.error(error.message || "Failed to upload logo");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleTemplateSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingTemplate(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/template", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Upload failed");

      toast.success("Proposal form template updated");
      await fetchSettings();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload template");
    } finally {
      setIsUploadingTemplate(false);
      // Reset input
      if (e.target) e.target.value = "";
    }
  };


  return (
    <div className="max-w-[800px] space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.title")}</h1>
        <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("admin.settings.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Academic Year */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400 flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.academicYear")}</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("admin.settings.academicYearDesc")}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="flex items-center bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
              <input 
                type="number"
                min="2000"
                max="2099"
                className="w-20 bg-transparent border-none focus:ring-0 text-center py-1.5 text-[13px] font-mono text-gray-900 dark:text-white" 
                placeholder="20xx"
                value={yearStart}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 4) return;
                  setYearStart(val);
                  if (val.length === 4) {
                    setYearEnd((parseInt(val) + 1).toString());
                  }
                }}
              />
              <span className="text-gray-300 dark:text-gray-600 font-bold px-1">/</span>
              <input 
                type="number"
                min="2000"
                max="2099"
                className="w-20 bg-transparent border-none focus:ring-0 text-center py-1.5 text-[13px] font-mono text-gray-900 dark:text-white" 
                placeholder="20xx"
                value={yearEnd}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 4) return;
                  setYearEnd(val);
                }}
              />
            </div>
            <Button 
              size="sm" 
              isLoading={loadingKey === "currentAcademicYear"}
              onClick={handleAcademicYearUpdate}
            >
              {t("common.update")}
            </Button>
            {settings.currentAcademicYear && settings.currentAcademicYear !== "N/A" && (
              <Button 
                variant="outline" 
                size="sm" 
                className="text-red-600 border-red-100 hover:bg-red-50"
                onClick={() => setShowAcademicYearDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Public Registration */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-md flex-shrink-0 ${settings.registrationOpen === "true" ? "bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400" : "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"}`}>
              {settings.registrationOpen === "true" ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.publicRegistration")}</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("admin.settings.publicRegistrationDesc")}</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Button 
              className="w-full sm:w-auto"
              variant={settings.registrationOpen === "true" ? "danger" : "primary"}
              isLoading={loadingKey === "registrationOpen"}
              onClick={() => handleUpdate("registrationOpen", settings.registrationOpen === "true" ? "false" : "true")}
            >
              {settings.registrationOpen === "true" ? t("admin.settings.closeRegistration") : t("admin.settings.openRegistration")}
            </Button>
          </div>
        </div>

        {/* Rejection Limits */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-50 dark:bg-amber-900/30 rounded-md text-amber-600 dark:text-amber-400 flex-shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.maxRejections")}</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("admin.settings.maxRejectionsDesc")}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="number"
              className="admin-input flex-1 sm:w-[80px] text-center"
              value={settings.maxResubmissions || "3"}
              onChange={(e) => setSettings({...settings, maxResubmissions: e.target.value})}
            />
            <Button
              size="sm"
              isLoading={loadingKey === "maxResubmissions"}
              onClick={() => handleUpdate("maxResubmissions", settings.maxResubmissions)}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>

        {/* PFE End Date — single system-wide deadline used for both the PFE
            internship end date and its final report deadline. */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-md text-purple-600 dark:text-purple-400 flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">PFE End Date</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                System-wide deadline for every PFE internship. The end date and the final report deadline both lock to this date.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input
              type="date"
              className="admin-input flex-1 sm:w-[180px] text-center"
              value={settings.pfeEndDate || ""}
              onChange={(e) => setSettings({ ...settings, pfeEndDate: e.target.value })}
            />
            <Button
              size="sm"
              isLoading={loadingKey === "pfeEndDate"}
              onClick={() => {
                if (!settings.pfeEndDate) {
                  toast.error("Pick a date first.");
                  return;
                }
                handleUpdate("pfeEndDate", settings.pfeEndDate);
              }}
            >
              {t("common.save")}
            </Button>
          </div>
        </div>

        {/* Departments Management (Replaces Specialities) */}
        <DepartmentsManager />

        {/* Promotions Management */}
        <SettingsList
          title={t("admin.settings.promotions")}
          description={t("admin.settings.promotionsDesc")}
          value={settings.availablePromotions}
          onUpdate={(val) => handleUpdate("availablePromotions", val)}
          isLoading={loadingKey === "availablePromotions"}
          icon={<Calendar className="h-5 w-5" />}
          colorClass="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />

        {/* PFE Max Team Size */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-md text-indigo-600 dark:text-indigo-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">
                PFE max team size
              </h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">
                Hard ceiling for PFE internships. If a company set a larger
                team size, the smaller of the two applies. Student-proposed
                normal internships are unlimited.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              max="10"
              className="w-24 admin-input text-center"
              value={pfeTeamSize}
              onChange={(e) => setPfeTeamSize(e.target.value)}
            />
            <Button
              size="sm"
              isLoading={loadingKey === "MAX_TEAM_SIZE"}
              onClick={() => {
                const n = parseInt(pfeTeamSize, 10);
                if (!Number.isFinite(n) || n < 1 || n > 10) {
                  toast.error("Team size must be between 1 and 10");
                  return;
                }
                handleUpdate("MAX_TEAM_SIZE", String(n));
              }}
            >
              {t("common.update")}
            </Button>
          </div>
        </div>

        {/* Branding & Assets */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-rose-50 dark:bg-rose-900/30 rounded-md text-rose-600 dark:text-rose-400">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.branding")}</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("admin.settings.brandingDesc")}</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-md border border-gray-200 dark:border-slate-700 border-dashed">
            <div className="h-24 w-24 bg-white dark:bg-slate-800 rounded-md border border-gray-200 dark:border-slate-700 flex items-center justify-center overflow-hidden shadow-inner">
              {brandingPreview || settings.universityLogo ? (() => {
                const rawUrl = brandingPreview || settings.universityLogo;
                const finalUrl = rawUrl.startsWith("/uploads/") ? `/api${rawUrl}` : rawUrl;
                return <img src={finalUrl} alt="Preview" className="h-full w-full object-contain p-2" />;
              })() : (
                <img src="/esst-logo.png" alt="Default Logo" className="h-full w-full object-contain p-3 opacity-50" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[13px] font-medium text-gray-900 dark:text-white mb-1">{t("admin.settings.logoLabel")}</p>
              <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">{t("admin.settings.logoHint")}</p>
              {!brandingFile ? (
                <div className="flex items-center gap-3 justify-center md:justify-start">
                   <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleBrandingSelect} />
                   <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 text-[12px] font-semibold h-9 px-4 rounded-md shadow-sm transition-all">
                     {t("admin.settings.chooseFile")}
                   </label>
                   {settings.universityLogo && (
                     <Button 
                       variant="outline" 
                       size="sm" 
                       className="text-red-600 border-red-100 hover:bg-red-50"
                       onClick={() => setShowLogoDeleteConfirm(true)}
                     >
                       <Trash2 className="h-3.5 w-3.5 mr-2" />
                       Supprimer
                     </Button>
                   )}
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center md:justify-start">
                   <Button size="sm" onClick={handleLogoUpload} isLoading={isUploadingLogo}>
                     {t("admin.settings.addLogo")}
                   </Button>
                   <Button size="sm" variant="outline" onClick={() => { setBrandingFile(null); setBrandingPreview(null); }} disabled={isUploadingLogo}>
                     {t("common.cancel")}
                   </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Topic Form Template */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.topicTemplate")}</h3>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("admin.settings.topicTemplateDesc")}</p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-md border border-gray-200 dark:border-slate-700 border-dashed">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-white dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                 </div>
                 <div>
                    <p className="text-[13px] font-medium text-gray-900 dark:text-white">{t("admin.settings.officialForm")}</p>
                    {settings.proposalFormTemplateUrl ? (
                      <div className="flex items-center gap-2">
                        <a 
                          href={settings.proposalFormTemplateUrl.startsWith("/api") ? settings.proposalFormTemplateUrl : `/api${settings.proposalFormTemplateUrl}`} 
                          target="_blank" 
                          className="text-[11px] text-indigo-600 hover:underline"
                        >
                          {t("admin.settings.downloadCurrent")}
                        </a>
                        <button 
                          onClick={() => setShowTemplateDeleteConfirm(true)}
                          disabled={loadingKey === "proposalFormTemplateUrl"}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                          title="Delete template"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-500">{t("admin.settings.noTemplate")}</p>
                    )}
                 </div>
              </div>
              <div className="w-full sm:w-auto">
                 <input type="file" id="template-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleTemplateSelect} />
                 <label htmlFor="template-upload" className={`cursor-pointer inline-flex items-center justify-center w-full sm:w-auto bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-[12px] font-semibold h-9 px-4 rounded-md shadow-sm transition-all ${isUploadingTemplate ? "opacity-50 cursor-not-allowed" : ""}`}>
                   {isUploadingTemplate ? t("admin.settings.uploading") : t("admin.settings.uploadNew")}
                 </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoDeleteConfirm}
        onClose={() => setShowLogoDeleteConfirm(false)}
        onConfirm={handleDeleteLogo}
        title="Delete University Logo"
        description="Are you sure you want to delete the university logo? The system will revert to the default placeholder."
        confirmLabel="Yes, Delete"
        isLoading={loadingKey === "universityLogo"}
      />

      <ConfirmDialog
        isOpen={showTemplateDeleteConfirm}
        onClose={() => setShowTemplateDeleteConfirm(false)}
        onConfirm={handleDeleteTemplate}
        title="Delete Proposal Template"
        description="Are you sure you want to delete the official proposal template? Users will no longer be able to download it."
        confirmLabel="Yes, Delete"
        isLoading={loadingKey === "proposalFormTemplateUrl"}
      />

      <ConfirmDialog
        isOpen={showAcademicYearDeleteConfirm}
        onClose={() => setShowAcademicYearDeleteConfirm(false)}
        onConfirm={handleDeleteAcademicYear}
        title="Clear Academic Year"
        description="Are you sure you want to clear the current academic year? The system will use the default cycle calculation until a new one is set."
        confirmLabel="Yes, Clear"
        isLoading={loadingKey === "currentAcademicYear"}
      />

      <ConfirmDialog
        isOpen={!!archiveOldYear}
        onClose={() => {
          setArchiveOldYear(null);
          setEvictionYear(null);
        }}
        onConfirm={confirmArchiveYear}
        title="Archive Previous Year?"
        description={
          `Archive all topics and internships from ${archiveOldYear}? ` +
          `They move to the Archives view (read-only) and leave the active lists.` +
          (evictionYear
            ? `

⚠ The archives keep only the 3 most recent years. Doing this ` +
              `pushes ${evictionYear} out: ALL of its data will be PERMANENTLY ` +
              `DELETED in 3 days. Download ${evictionYear} from Archives → Export ` +
              `BEFORE you confirm — this cannot be undone.`
            : ``)
        }
        confirmLabel={`Archive ${archiveOldYear ?? ""}`}
        variant={evictionYear ? "danger" : "warning"}
        isLoading={isArchivingYear}
      />
    </div>
  );
}

interface SettingsListProps {
  title: string;
  description: string;
  value: string;
  onUpdate: (value: string) => void;
  isLoading: boolean;
  icon: React.ReactNode;
  colorClass: string;
}

function SettingsList({ title, description, value, onUpdate, isLoading, icon, colorClass }: SettingsListProps) {
  const { t } = useTranslation();
  const [newItem, setNewItem] = useState("");
  const items = value.split(",").map(s => s.trim()).filter(Boolean);

  const addItem = () => {
    if (!newItem.trim()) return;
    if (items.includes(newItem.trim())) {
      toast.error("Item already exists");
      return;
    }
    const updated = [...items, newItem.trim()].join(",");
    onUpdate(updated);
    setNewItem("");
  };

  const removeItem = (item: string) => {
    const updated = items.filter(i => i !== item).join(",");
    onUpdate(updated);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className={`p-3 rounded-md ${colorClass}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 dark:bg-slate-800/50 rounded-md border border-gray-200 dark:border-slate-700">
          {items.map(item => (
            <div key={item} className="flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 text-[12px] font-medium text-gray-700 dark:text-gray-200 shadow-sm">
              {item}
              <button 
                onClick={() => removeItem(item)}
                className="ml-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
          {items.length === 0 && <span className="text-gray-400 dark:text-gray-500 text-[12px]">{t("admin.settings.noItems")}</span>}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Input 
            placeholder={t("admin.settings.newItemPlaceholder")} 
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addItem()}
            containerClassName="w-full sm:flex-1"
          />
          <Button 
            className="w-full sm:w-auto"
            size="sm" 
            onClick={addItem}
            isLoading={isLoading}
            disabled={!newItem.trim()}
          >
            {t("admin.settings.addItem")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function DepartmentsManager() {
  const { t } = useTranslation();
  const [departments, setDepartments] = useState<any[]>([]);
  const [newDept, setNewDept] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const fetchDepartments = async () => {
    setIsFetching(true);
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      if (data.data) {
        setDepartments(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAdd = async () => {
    if (!newDept.trim()) return;
    setIsLoading(true);
    try {
      const res = await fetch("/api/filieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDept }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add department");
      
      toast.success("Department added successfully");
      setNewDept("");
      await fetchDepartments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const res = await fetch(`/api/filieres/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete department");
      }
      toast.success("Department removed");
      await fetchDepartments();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-md p-6 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
          <Settings className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900 dark:text-white">{t("admin.settings.departments")}</h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">{t("admin.settings.departmentsDesc")}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 dark:bg-slate-800/50 rounded-md border border-gray-200 dark:border-slate-700">
          {isFetching ? (
            <span className="text-gray-400 dark:text-gray-500 text-[12px]">{t("admin.settings.loading")}</span>
          ) : departments.map(dept => (
            <div key={dept.id} className="flex items-center bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-md px-2 py-1 text-[12px] font-medium text-gray-700 dark:text-gray-200 shadow-sm">
              {dept.name}
              <button 
                onClick={() => handleRemove(dept.id)}
                className="ml-2 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                title="Delete Department"
              >
                ×
              </button>
            </div>
          ))}
          {!isFetching && departments.length === 0 && <span className="text-gray-400 dark:text-gray-500 text-[12px]">{t("admin.settings.noDepartments")}</span>}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Input 
            placeholder={t("admin.settings.newDeptPlaceholder")} 
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            containerClassName="w-full sm:flex-1"
          />
          <Button 
            className="w-full sm:w-auto"
            size="sm" 
            onClick={handleAdd}
            isLoading={isLoading}
            disabled={!newDept.trim()}
          >
            {t("admin.settings.addDepartment")}
          </Button>
        </div>
      </div>
    </div>
  );
}

