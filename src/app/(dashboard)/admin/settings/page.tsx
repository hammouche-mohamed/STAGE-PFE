"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "sonner";
import { Settings, Lock, Unlock, Calendar, Save } from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    currentAcademicYear: "2024-2025",
    registrationOpen: "true",
    maxResubmissions: "3",
  });
  const [isLoading, setIsLoading] = useState(false);

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
      console.error("Failed to load settings");
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdate = async (key: string, value: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success(`${key} updated successfully`);
      fetchSettings();
    } catch (error) {
      toast.error("Failed to update setting");
    } finally {
      setIsLoading(false);
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
        <div className="bg-white border border-gray-200 rounded-md p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-50 rounded-md text-indigo-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Active Academic Year</h3>
              <p className="text-[12px] text-gray-500">Topics and internships will be labeled with this year.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input 
              className="admin-input w-[120px] text-center font-mono" 
              value={settings.currentAcademicYear}
              onChange={(e) => setSettings({...settings, currentAcademicYear: e.target.value})}
            />
            <Button size="sm" onClick={() => handleUpdate("currentAcademicYear", settings.currentAcademicYear)}>Update</Button>
          </div>
        </div>

        {/* Public Registration */}
        <div className="bg-white border border-gray-200 rounded-md p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-md ${settings.registrationOpen === "true" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>
              {settings.registrationOpen === "true" ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Public Registration Portal</h3>
              <p className="text-[12px] text-gray-500">Allow users to submit new registration requests.</p>
            </div>
          </div>
          <div>
            <Button 
              variant={settings.registrationOpen === "true" ? "danger" : "primary"}
              onClick={() => handleUpdate("registrationOpen", settings.registrationOpen === "true" ? "false" : "true")}
            >
              {settings.registrationOpen === "true" ? "Close Registration" : "Open Registration"}
            </Button>
          </div>
        </div>

        {/* Rejection Limits */}
        <div className="bg-white border border-gray-200 rounded-md p-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-amber-50 rounded-md text-amber-600">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[14px] font-semibold text-gray-900">Max Topic Rejections</h3>
              <p className="text-[12px] text-gray-500">Limit how many times a topic can be rejected before requiring a new one.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <input 
              type="number"
              className="admin-input w-[80px] text-center" 
              value={settings.maxResubmissions}
              onChange={(e) => setSettings({...settings, maxResubmissions: e.target.value})}
            />
            <Button size="sm" onClick={() => handleUpdate("maxResubmissions", settings.maxResubmissions)}>Save</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
