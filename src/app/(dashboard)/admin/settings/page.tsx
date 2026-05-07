"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Settings, Lock, Unlock, Calendar, Palette, FileText } from "lucide-react";
import { useTranslation } from "@/lib/i18n/LanguageContext";

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
  });
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [brandingFile, setBrandingFile] = useState<File | null>(null);
  const [brandingPreview, setBrandingPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingTemplate, setIsUploadingTemplate] = useState(false);

  // NFR-S2: client-side role guard — redirect non-admins immediately
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user.role !== "ADMIN") {
      router.replace("/");
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Block render until session is confirmed
  if (status === "loading" || !session || session.user.role !== "ADMIN") {
    return <div className="p-8 text-center text-gray-400 text-sm">Verifying access…</div>;
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
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };


  const handleUpdate = async (key: string, value: string) => {
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
    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update setting");
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <div className="max-w-[800px] space-y-6">
      <div>
        <h1 className="text-[17px] font-semibold text-gray-900">System Configuration</h1>
        <p className="text-[13px] text-gray-500 mt-0.5">Control global application behavior and internship campaign parameters.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Academic Year */}
        <div className="bg-white border border-gray-200 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-md text-indigo-600 flex-shrink-0">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Active Academic Year</h3>
              <p className="text-[12px] text-gray-500">Topics and internships will be labeled with this year.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <input 
              className="admin-input flex-1 sm:w-[120px] text-center font-mono" 
              value={settings.currentAcademicYear || "2024-2025"}
              onChange={(e) => setSettings({...settings, currentAcademicYear: e.target.value})}
            />
            <Button 
              size="sm" 
              isLoading={loadingKey === "currentAcademicYear"}
              onClick={() => handleUpdate("currentAcademicYear", settings.currentAcademicYear)}
            >
              Update
            </Button>
          </div>
        </div>

        {/* Public Registration */}
        <div className="bg-white border border-gray-200 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-md flex-shrink-0 ${settings.registrationOpen === "true" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {settings.registrationOpen === "true" ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Public Registration Portal</h3>
              <p className="text-[12px] text-gray-500">Allow users to submit new registration requests.</p>
            </div>
          </div>
          <div className="w-full sm:w-auto">
            <Button 
              className="w-full sm:w-auto"
              variant={settings.registrationOpen === "true" ? "danger" : "primary"}
              isLoading={loadingKey === "registrationOpen"}
              onClick={() => handleUpdate("registrationOpen", settings.registrationOpen === "true" ? "false" : "true")}
            >
              {settings.registrationOpen === "true" ? "Close Registration" : "Open Registration"}
            </Button>
          </div>
        </div>

        {/* Rejection Limits */}
        <div className="bg-white border border-gray-200 rounded-md p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-50 rounded-md text-amber-600 flex-shrink-0">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Max Topic Rejections</h3>
              <p className="text-[12px] text-gray-500">Limit how many times a topic can be rejected.</p>
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
              Save
            </Button>
          </div>
        </div>

        {/* Specialities Management */}
        <SettingsList
          title="Specialities Management"
          description="Add or remove specialities available for student registration."
          value={settings.availableSpecialities}
          onUpdate={(val) => handleUpdate("availableSpecialities", val)}
          isLoading={loadingKey === "availableSpecialities"}
          icon={<Settings className="h-5 w-5" />}
          colorClass="bg-blue-50 text-blue-600"
        />

        {/* Promotions Management */}
        <SettingsList
          title="Promotions Management"
          description="Manage the promotion levels available (e.g., M1, M2)."
          value={settings.availablePromotions}
          onUpdate={(val) => handleUpdate("availablePromotions", val)}
          isLoading={loadingKey === "availablePromotions"}
          icon={<Calendar className="h-5 w-5" />}
          colorClass="bg-purple-50 text-purple-600"
        />

        {/* Branding & Assets */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-rose-50 rounded-md text-rose-600">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Branding & Assets</h3>
              <p className="text-[12px] text-gray-500">Manage the official university logo and visuals.</p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 p-4 bg-gray-50 rounded-md border border-gray-200 border-dashed">
            <div className="h-24 w-24 bg-white rounded-md border border-gray-200 flex items-center justify-center overflow-hidden">
              {brandingPreview || settings.universityLogo ? (() => {
                const rawUrl = brandingPreview || settings.universityLogo;
                const finalUrl = rawUrl.startsWith("/uploads/") ? `/api${rawUrl}` : rawUrl;
                return <img src={finalUrl} alt="Preview" className="h-full w-full object-contain p-2" />;
              })() : (
                <img src="/esst-logo.png" alt="Default Logo" className="h-full w-full object-contain p-3 opacity-50" />
              )}
            </div>
            <div className="flex-1 text-center md:text-left">
              <p className="text-[13px] font-medium text-gray-900 mb-1">University Official Logo</p>
              <p className="text-[12px] text-gray-500 mb-4">Recommended: PNG with transparent background (Min 200x200px).</p>
              {!brandingFile ? (
                <div>
                   <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleBrandingSelect} />
                   <label htmlFor="logo-upload" className="cursor-pointer inline-flex items-center justify-center bg-indigo-600 text-white hover:bg-indigo-700 text-[12px] font-semibold h-9 px-4 rounded-md shadow-sm transition-all">
                     Choose File
                   </label>
                </div>
              ) : (
                <div className="flex items-center gap-3 justify-center md:justify-start">
                   <Button size="sm" onClick={handleLogoUpload} isLoading={isUploadingLogo}>
                     Add System Logo
                   </Button>
                   <Button size="sm" variant="outline" onClick={() => { setBrandingFile(null); setBrandingPreview(null); }} disabled={isUploadingLogo}>
                     Cancel
                   </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Topic Form Template */}
        <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
          <div className="flex items-center space-x-4 mb-6">
            <div className="p-3 bg-blue-50 rounded-md text-blue-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Topic Proposal Template</h3>
              <p className="text-[12px] text-gray-500">Official form template for students and companies.</p>
            </div>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200 border-dashed">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                 <div className="h-10 w-10 bg-white rounded border border-gray-200 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-gray-400" />
                 </div>
                 <div>
                    <p className="text-[13px] font-medium text-gray-900">Official Proposal Form</p>
                    {settings.proposalFormTemplateUrl ? (
                      <a href={`/api${settings.proposalFormTemplateUrl}`} target="_blank" className="text-[11px] text-indigo-600 hover:underline">Download current template</a>
                    ) : (
                      <p className="text-[11px] text-gray-500">No template uploaded yet.</p>
                    )}
                 </div>
              </div>
              <div>
                 <input type="file" id="template-upload" className="hidden" accept=".pdf,.doc,.docx" onChange={handleTemplateSelect} />
                 <label htmlFor="template-upload" className={`cursor-pointer inline-flex items-center justify-center bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-[12px] font-semibold h-9 px-4 rounded-md shadow-sm transition-all ${isUploadingTemplate ? "opacity-50 cursor-not-allowed" : ""}`}>
                   {isUploadingTemplate ? "Uploading..." : "Upload New Template"}
                 </label>
              </div>
            </div>
          </div>
        </div>
      </div>
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
    <div className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
      <div className="flex items-center space-x-4 mb-6">
        <div className={`p-3 rounded-md ${colorClass}`}>
          {icon}
        </div>
        <div>
          <h3 className="text-[14px] font-semibold text-gray-900">{title}</h3>
          <p className="text-[12px] text-gray-500">{description}</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2 min-h-[40px] p-3 bg-gray-50 rounded-md border border-gray-200">
          {items.map(item => (
            <div key={item} className="flex items-center bg-white border border-gray-200 rounded-md px-2 py-1 text-[12px] font-medium text-gray-700 shadow-sm">
              {item}
              <button 
                onClick={() => removeItem(item)}
                className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
          {items.length === 0 && <span className="text-gray-400 text-[12px]">No items configured</span>}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Input 
            placeholder="Add new item..." 
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
            Add Item
          </Button>
        </div>
      </div>
    </div>
  );
}

