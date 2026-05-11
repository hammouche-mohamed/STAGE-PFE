"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  UserX,
  UserCheck,
  Shield,
  GraduationCap,
  Building2,
  Mail,
  User as UserIcon,
  AlertCircle,
  MoreHorizontal,
  Edit,
  Eye,
  Key,
  Trash2
} from "lucide-react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useTranslation } from "@/lib/i18n/LanguageContext";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "COMPANY";
  isActive: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  adminProfile?: {
    isSuperAdmin: boolean;
    filiere?: { name: string } | null;
  } | null;
  teacherProfile?: {
    filiere?: { name: string } | null;
  } | null;
  studentProfile?: {
    filiere?: { name: string } | null;
  } | null;
}

export default function AdminUsersPage() {
  const { t, isRTL } = useTranslation();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [userToDeactivate, setUserToDeactivate] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [userToView, setUserToView] = useState<any | null>(null);
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [userToReset, setUserToReset] = useState<any | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isProcessingStatus, setIsProcessingStatus] = useState(false);
  const [isFetchingDetail, setIsFetchingDetail] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [filiereFilter, setFiliereFilter] = useState("ALL");
  
  const [activeTab, setActiveTab] = useState<"USERS" | "BLOCKLIST" | "TEAMS">("USERS");
  const [blocklist, setBlocklist] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [isFetchingBlocklist, setIsFetchingBlocklist] = useState(false);
  const [isFetchingTeams, setIsFetchingTeams] = useState(false);
  const [isAddBlocklistModalOpen, setIsAddBlocklistModalOpen] = useState(false);
  const [newBlockedEmail, setNewBlockedEmail] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [emailToUnblock, setEmailToUnblock] = useState<any | null>(null);
  const [isAddAdminModalOpen, setIsAddAdminModalOpen] = useState(false);
  const [newAdminData, setNewAdminData] = useState({ name: "", email: "", password: "", filiereId: "", isSuperAdmin: false });
  const [filieres, setFilieres] = useState<any[]>([]);

  const [settings, setSettings] = useState<any>({});

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams();
      if (roleFilter !== "ALL") params.append("role", roleFilter);
      if (filiereFilter !== "ALL") params.append("filiereId", filiereFilter);
      if (search.trim()) params.append("search", search.trim());
      
      const res = await fetch(`/api/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadUsersFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPublicSettings = async () => {
    try {
      const res = await fetch("/api/settings/public");
      const data = await res.json();
      setSettings(data.data || {});
    } catch (error) {
      console.error("Failed to load settings");
    }
  };

  const fetchBlocklist = async () => {
    setIsFetchingBlocklist(true);
    try {
      const res = await fetch("/api/blocklist");
      const data = await res.json();
      setBlocklist(data.data || []);
    } catch (error) {
      toast.error("Failed to load blocklist");
    } finally {
      setIsFetchingBlocklist(false);
    }
  };

  const fetchFilieres = async () => {
    try {
      const res = await fetch("/api/filieres");
      const data = await res.json();
      setFilieres(data.data || []);
    } catch (error) {
      console.error("Failed to load filieres");
    }
  };

  const fetchTeams = async () => {
    setIsFetchingTeams(true);
    try {
      const res = await fetch("/api/teams");
      const data = await res.json();
      setTeams(data.data || []);
    } catch (error) {
      console.error("Failed to load teams");
    } finally {
      setIsFetchingTeams(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchBlocklist();
    fetchFilieres();
    fetchTeams();
    fetchPublicSettings();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, filiereFilter, search]);

  const handleUnblock = (item: any) => {
    setEmailToUnblock(item);
  };

  const executeUnblock = async () => {
    if (!emailToUnblock) return;
    setIsProcessingStatus(true);
    try {
      const res = await fetch(`/api/blocklist/${emailToUnblock.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Email unblocked successfully");
        setEmailToUnblock(null);
        fetchBlocklist();
      } else {
        toast.error("Failed to unblock email");
      }
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleAddBlocklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockedEmail.trim()) return;
    
    setIsProcessingStatus(true);
    try {
      const res = await fetch("/api/blocklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newBlockedEmail.trim(), reason: newBlockedReason.trim() }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to block email");
      
      toast.success("Email blocked successfully");
      setIsAddBlocklistModalOpen(false);
      setNewBlockedEmail("");
      setNewBlockedReason("");
      fetchBlocklist();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const s = search.toLowerCase();
    const matchesSearch = !search || 
                         u.name.toLowerCase().includes(s) || 
                         u.email.toLowerCase().includes(s) ||
                         (u as any).studentProfile?.studentId?.toLowerCase().includes(s);
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const toggleUserStatus = async (user: User) => {
    // If activating, do it directly. If deactivating, confirm first.
    if (!user.isActive) {
      await executeStatusUpdate(user.id, true);
    } else {
      setUserToDeactivate(user);
    }
  };

  const executeStatusUpdate = async (id: string, newStatus: boolean) => {
    setIsProcessingStatus(true);
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(newStatus ? t("toast.userUpdated") : t("toast.userUpdated"));
      setUserToDeactivate(null);
      fetchUsers();
    } catch (error) {
      toast.error(t("toast.userStatusFailed"));
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    setIsProcessingStatus(true);
    try {
      const res = await fetch(`/api/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Delete failed");

      toast.success(t("toast.userDeleted"));
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete user");
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminData.password.length < 12 || !/[0-9]/.test(newAdminData.password)) {
      toast.error(t("errors.passwordTooShort"));
      setIsProcessingStatus(false);
      return;
    }

    setIsProcessingStatus(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newAdminData,
          role: "ADMIN"
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create admin");

      toast.success("Admin created successfully");
      setIsAddAdminModalOpen(false);
      setNewAdminData({ name: "", email: "", password: "", filiereId: "", isSuperAdmin: false });
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleFetchDetail = async (userId: string, target: 'view' | 'edit') => {
    setIsFetchingDetail(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch user details");
      
      if (target === 'view') setUserToView(data.data);
      else setUserToEdit({
        ...data.data,
        profileData: data.data.studentProfile || data.data.teacherProfile || data.data.companyProfile || data.data.adminProfile || {}
      });
      setActiveMenuId(null);
    } catch (error) {
      toast.error(t("toast.userDetailsFailed"));
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    // Show confirmation before saving
    setShowEditConfirm(true);
  };

  const executeUpdateUser = async () => {
    setIsProcessingStatus(true);
    try {
      const res = await fetch(`/api/users/${userToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userToEdit.name,
          email: userToEdit.email,
          role: userToEdit.role,
          profileData: userToEdit.profileData,
          notifyUser: true,
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(t("toast.userUpdated"));
      setShowEditConfirm(false);
      setUserToEdit(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(t("toast.saveFailed"));
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPasswordValue.length < 12 || !/[0-9]/.test(resetPasswordValue)) {
      toast.error(t("errors.passwordTooShort"));
      return;
    }
    setIsProcessingStatus(true);
    try {
      const res = await fetch(`/api/users/${userToReset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });

      if (!res.ok) throw new Error("Reset failed");

      toast.success(`Password reset for ${userToReset.name}`);
      setUserToReset(null);
      setResetPasswordValue("");
    } catch (error) {
      toast.error(t("toast.passwordResetFailed"));
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const roleIcons = {
    ADMIN: <Shield className="h-4 w-4 text-purple-600" />,
    TEACHER: <GraduationCap className="h-4 w-4 text-indigo-600" />,
    STUDENT: <Users className="h-4 w-4 text-green-600" />,
    COMPANY: <Building2 className="h-4 w-4 text-amber-600" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900 dark:text-white">{t("admin.users.title")}</h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">{t("admin.users.subtitle")}</p>
        </div>
        {session?.user?.isSuperAdmin && (
          <Button 
            size="sm" 
            onClick={() => setIsAddAdminModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            {t("admin.users.addAdmin")}
          </Button>
        )}
      </div>

      <div className="flex gap-4 border-b border-gray-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("USERS")}
          className={`pb-3 px-1 text-[13px] font-semibold border-b-2 transition-colors ${
            activeTab === "USERS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {t("admin.users.activeUsers")}
        </button>
        <button
          onClick={() => setActiveTab("TEAMS")}
          className={`pb-3 px-1 text-[13px] font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "TEAMS"
              ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          }`}
        >
          {t("admin.users.studentTeams")}
          {teams.length > 0 && (
            <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 py-0.5 px-2 rounded-full text-[10px]">
              {teams.length}
            </span>
          )}
        </button>
        {session?.user?.isSuperAdmin && (
          <button
            onClick={() => setActiveTab("BLOCKLIST")}
            className={`pb-3 px-1 text-[13px] font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "BLOCKLIST"
                ? "border-red-600 text-red-600 dark:text-red-400 dark:border-red-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            {t("admin.users.blocklist")}
            {blocklist.length > 0 && (
              <span className="bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-300 py-0.5 px-2 rounded-full text-[10px]">
                {blocklist.length}
              </span>
            )}
          </button>
        )}
      </div>

      {activeTab === "USERS" && (
        <>
          {/* Filters bar */}
          <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400`} />
          <input
            type="text"
            placeholder={t("admin.users.searchPlaceholder")}
            className={`admin-input ${isRTL ? "pr-10 text-right" : "pl-10"}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {session?.user?.isSuperAdmin && (
            <select 
              className="admin-input min-w-[140px]"
              value={filiereFilter}
              onChange={(e) => setFiliereFilter(e.target.value)}
            >
              <option value="ALL">{t("admin.users.allFilieres") || "All Departments"}</option>
              {filieres.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          )}
          <select 
            className="admin-input min-w-[140px]"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">{t("admin.users.allRoles")}</option>
            <option value="STUDENT">{t("roles.STUDENT")}</option>
            <option value="TEACHER">{t("roles.TEACHER")}</option>
            <option value="COMPANY">{t("roles.COMPANY")}</option>
            <option value="ADMIN">{t("roles.ADMIN")}</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table stacked-table">
          <thead className="admin-table-header">
            <tr className={isRTL ? "text-right" : "text-left"}>
              <th className={isRTL ? "text-right" : "text-left"}>{t("admin.users.user")}</th>
              <th className={isRTL ? "text-right" : "text-left"}>{t("common.role")}</th>
              <th className={isRTL ? "text-right" : "text-left"}>{t("common.status")}</th>
              <th className={isRTL ? "text-right" : "text-left"}>{t("admin.users.createdAt")}</th>
              <th className={isRTL ? "text-left" : "text-right"}>{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-12 text-gray-400">{t("common.loading")}</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr className="empty-row">
                <td colSpan={5} className="text-center py-12 text-gray-400">{t("common.noData")}</td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id} className="admin-table-row">
                  <td data-label="User" className="py-3 sm:py-0">
                    <div className="flex items-center gap-3 justify-end sm:justify-start w-full">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-[12px] font-bold overflow-hidden flex-shrink-0 order-2 sm:order-1">
                        {user.avatarUrl ? (
                          <Image 
                            src={user.avatarUrl} 
                            alt={user.name} 
                            width={32} 
                            height={32} 
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>
                      <div className="flex flex-col min-w-0 items-end sm:items-start order-1 sm:order-2">
                        <span className="font-medium text-[12px] sm:text-[13px] text-gray-900 dark:text-white text-right sm:text-left">{user.name}</span>
                        <div className="text-[9px] sm:text-[10px] text-gray-400 dark:text-slate-300 flex items-center justify-end sm:justify-start w-full">
                          <span className="whitespace-nowrap sm:whitespace-normal sm:break-all text-right sm:text-left">{user.email}</span>
                          <Mail className="h-2.5 w-2.5 ml-1 flex-shrink-0 text-gray-400 dark:text-slate-400 sm:hidden" />
                          <Mail className="h-2.5 w-2.5 ml-1 flex-shrink-0 text-gray-400 dark:text-slate-400 hidden sm:block" />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td data-label="Role">
                    <div className="flex flex-col sm:items-start items-end gap-1">
                      <div className="flex items-center gap-2">
                        <span className="flex-shrink-0 hidden sm:block">{roleIcons[user.role]}</span>
                        <span className="text-[10px] sm:text-[12px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-tight whitespace-nowrap">{t(`roles.${user.role}`)}</span>
                      </div>
                      {user.role === "ADMIN" && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1.5 py-0.5 font-semibold bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700 uppercase tracking-tight whitespace-nowrap">
                          {user.adminProfile?.isSuperAdmin 
                            ? t("roles.SUPER_ADMIN") 
                            : `${t("roles.ADMIN")} (${user.adminProfile?.filiere?.name || "Global"})`}
                        </span>
                      )}
                      {user.role === "TEACHER" && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1.5 py-0.5 font-semibold bg-gray-50 dark:bg-slate-800 rounded border border-gray-100 dark:border-slate-700 uppercase tracking-tight">
                          {user.teacherProfile?.filiere?.name || "No Dept"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td data-label={t("common.status")}>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] sm:text-[12px] font-bold leading-none ${user.isActive ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                        {user.isActive ? t("admin.users.active") : t("admin.users.inactive")}
                      </span>
                      <div className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${user.isActive ? "bg-green-500" : "bg-red-500"} mb-[1px]`} />
                    </div>
                  </td>
                  <td data-label="Created">
                    <span className="text-[12px] text-gray-500 dark:text-gray-400">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </span>
                  </td>
                  <td data-label="Actions" className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {user.id !== currentUserId && (session?.user?.isSuperAdmin || user.role !== "TEACHER") && (
                        <button 
                          onClick={() => toggleUserStatus(user)}
                          className={`p-1.5 rounded hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors ${user.isActive ? "text-red-600" : "text-green-600"}`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      )}
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                          className={`p-1.5 rounded transition-colors ${activeMenuId === user.id ? "bg-gray-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400" : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {activeMenuId === user.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className={`absolute right-0 ${index > filteredUsers.length - 3 ? 'bottom-full mb-1' : 'mt-1'} w-44 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
                              <button 
                                onClick={() => handleFetchDetail(user.id, 'edit')}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                              >
                                <Edit className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"} text-gray-400 dark:text-gray-500`} />
                                {t("admin.users.editAccount")}
                              </button>
                              <button 
                                onClick={() => handleFetchDetail(user.id, 'view')}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                              >
                                <Eye className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"} text-gray-400 dark:text-gray-500`} />
                                {t("admin.users.viewProfile")}
                              </button>
                              {user.id !== currentUserId && (session?.user?.isSuperAdmin || user.role !== "TEACHER") && (
                                <button 
                                  onClick={() => {
                                    setUserToReset(user);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                                >
                                  <Key className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"} text-gray-400 dark:text-gray-500`} />
                                  {t("admin.users.resetPassword")}
                                </button>
                              )}
                              {user.id !== currentUserId && (session?.user?.isSuperAdmin || user.role !== "TEACHER") && (
                                <>
                                  <div className="h-px bg-gray-50 dark:bg-slate-700 my-1" />
                                  <button 
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center px-4 py-2 text-[12px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                  >
                                    <Trash2 className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"}`} />
                                    {t("admin.users.deleteMember")}
                                  </button>
                                </>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <ConfirmDialog
        isOpen={!!userToDeactivate}
        onClose={() => setUserToDeactivate(null)}
        onConfirm={() => userToDeactivate && executeStatusUpdate(userToDeactivate.id, false)}
        title={t("admin.users.deactivateTitle")}
        description={t("admin.users.deactivateDesc", { name: userToDeactivate?.name })}
        confirmLabel={t("admin.users.inactive")}
        isLoading={isProcessingStatus}
      />

      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={executeDeleteUser}
        title={t("admin.users.deleteTitle")}
        description={t("admin.users.deleteDesc", { name: userToDelete?.name })}
        confirmLabel={t("admin.users.deleteMember")}
        variant="danger"
        isLoading={isProcessingStatus}
      />

      {/* View Profile Modal */}
      <Modal
        isOpen={!!userToView}
        onClose={() => setUserToView(null)}
        title={t("admin.users.profileTitle")}
        size="md"
      >
        {userToView && (
          <div className="space-y-6 py-2">
            <div className="flex items-center gap-4 border-b border-gray-50 dark:border-slate-800 pb-4">
              <div className="h-16 w-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-[24px] font-bold text-indigo-700 dark:text-indigo-400 overflow-hidden">
                {userToView.avatarUrl ? (
                  <Image 
                    src={userToView.avatarUrl} 
                    alt={userToView.name} 
                    width={64} 
                    height={64} 
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  userToView.name.charAt(0)
                )}
              </div>
              <div>
                <h3 className="text-[18px] font-bold text-gray-900 dark:text-white">{userToView.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={userToView.role} />
                  <span className="text-[13px] text-gray-500 dark:text-gray-400">{userToView.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">{t("common.status")}</label>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${userToView.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-[14px] font-medium text-gray-900 dark:text-white">{userToView.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Member Since</label>
                <p className="text-[14px] dark:text-gray-200">{format(new Date(userToView.createdAt), "MMMM d, yyyy")}</p>
              </div>

              {userToView.role === "STUDENT" && userToView.studentProfile && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Speciality</label>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">{userToView.studentProfile.speciality}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Promotion</label>
                    <p className="text-[14px] text-gray-900 dark:text-white">{userToView.studentProfile.promotion}</p>
                  </div>
                </>
              )}

              {userToView.role === "TEACHER" && userToView.teacherProfile && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Grade</label>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">{userToView.teacherProfile.grade}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Max Students</label>
                    <p className="text-[14px] text-gray-900 dark:text-white">{userToView.teacherProfile.maxStudents} Teams</p>
                  </div>
                </>
              )}

              {userToView.role === "COMPANY" && userToView.companyProfile && (
                <>
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest block mb-1">Company Detail</label>
                    <p className="text-[14px] font-medium text-gray-900 dark:text-white">{userToView.companyProfile.companyName} - {userToView.companyProfile.sector}</p>
                    <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-1">{userToView.companyProfile.address}, {userToView.companyProfile.wilaya}</p>
                  </div>
                </>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <Button onClick={() => setUserToView(null)}>{t("common.close")}</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!userToEdit}
        onClose={() => setUserToEdit(null)}
        title={t("admin.users.editTitle")}
        size="lg"
      >
        {userToEdit && (
          <form onSubmit={handleUpdateUser} className="space-y-6 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t("admin.users.fullName")}
                value={userToEdit.name}
                onChange={(e) => setUserToEdit({...userToEdit, name: e.target.value})}
                required
              />
              <Input
                label={t("admin.users.email")}
                type="email"
                value={userToEdit.email}
                onChange={(e) => setUserToEdit({...userToEdit, email: e.target.value})}
                required
              />
              
              <div className="col-span-2 space-y-2">
                <label className="admin-form-label">{t("admin.users.systemRole")} <span className="text-red-500">*</span></label>
                <select 
                  className="admin-input"
                  value={userToEdit.role}
                  onChange={(e) => setUserToEdit({...userToEdit, role: e.target.value})}
                >
                  <option value="STUDENT">STUDENT</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="COMPANY">COMPANY</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </div>

              {/* Role Specific Fields */}
              {userToEdit.role === "STUDENT" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 block">{t("admin.users.speciality")}</label>
                    <select
                      className="admin-input"
                      value={userToEdit.profileData?.speciality || ""}
                      onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, speciality: e.target.value}})}
                    >
                      <option value="">Select Speciality...</option>
                      {filieres.map((f: any) => (
                        <option key={f.id} value={f.name}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 block">{t("admin.users.promotion")}</label>
                    <select
                      className="admin-input"
                      value={userToEdit.profileData?.level || ""}
                      onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, level: e.target.value}})}
                    >
                      <option value="">Select Promotion...</option>
                      {(settings.availablePromotions?.split(',') || []).map((s: string) => (
                        <option key={s} value={s.trim()}>{s.trim()}</option>
                      ))}
                                    </select>
                  </div>
                  
                  <Input
                    label="Student ID"
                    value={userToEdit.profileData?.studentId || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, studentId: e.target.value}})}
                  />
                </>
              )}

              {userToEdit.role === "ADMIN" && (
                <div className="col-span-2 space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 block">Department (Filière)</label>
                    <select
                      className={`admin-input ${userToEdit.profileData?.isSuperAdmin ? 'bg-gray-100 dark:bg-slate-900 opacity-60 cursor-not-allowed' : ''}`}
                      disabled={userToEdit.profileData?.isSuperAdmin}
                      value={userToEdit.profileData?.filiereId || ""}
                      onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, filiereId: e.target.value}})}
                    >
                      <option value="">{userToEdit.profileData?.isSuperAdmin ? 'Global Access (No Department)' : 'Select Department...'}</option>
                      {filieres.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl border border-gray-100 dark:border-slate-800 transition-all hover:border-indigo-200 dark:hover:border-indigo-900/50">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="isSuperAdmin" className="text-[14px] font-bold text-gray-900 dark:text-white cursor-pointer">
                        Super Administrator
                      </label>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400 max-w-[300px]">
                        Grants full system access and bypasses departmental restrictions. Use with caution.
                      </span>
                    </div>
                    
                    <button
                      type="button"
                      id="isSuperAdmin"
                      onClick={() => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, isSuperAdmin: !userToEdit.profileData?.isSuperAdmin}})}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                        userToEdit.profileData?.isSuperAdmin ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          userToEdit.profileData?.isSuperAdmin ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {userToEdit.role === "TEACHER" && (
                <>
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 block">Department (Filière)</label>
                    <select
                      className="admin-input"
                      value={userToEdit.profileData?.filiereId || ""}
                      onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, filiereId: e.target.value}})}
                    >
                      <option value="">Select Department...</option>
                      {filieres.map((f: any) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[12px] font-semibold text-gray-700 dark:text-gray-300 block">Grade (Academic Title)</label>
                    <Input
                      placeholder="e.g. Professor, MCA, MCB..."
                      value={userToEdit.profileData?.grade || ""}
                      onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, grade: e.target.value}})}
                    />
                  </div>
                  <Input
                    label={t("admin.users.maxCapacity")}
                    type="number"
                    value={userToEdit.profileData?.maxStudents || 5}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, maxStudents: parseInt(e.target.value)}})}
                  />
                </>
              )}

              {userToEdit.role === "COMPANY" && (
                <>
                  <Input
                    label={t("admin.users.companyName")}
                    value={userToEdit.profileData?.companyName || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, companyName: e.target.value}})}
                  />
                  <Input
                    label={t("admin.users.sector")}
                    value={userToEdit.profileData?.sector || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, sector: e.target.value}})}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setUserToEdit(null)}>{t("common.cancel")}</Button>
              <Button type="submit" isLoading={isProcessingStatus}>{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={!!userToReset}
        onClose={() => {
          setUserToReset(null);
          setResetPasswordValue("");
        }}
        title={t("admin.users.resetTitle")}
        size="sm"
      >
        {userToReset && (
          <form onSubmit={handleResetPassword} className="space-y-6 py-2">
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-3 rounded-md text-[13px] text-amber-800 dark:text-amber-400 leading-snug">
              {t("admin.users.resetDesc", { name: userToReset.name })}
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="Min. 12 characters + 1 number"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              required
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setUserToReset(null)}>{t("common.cancel")}</Button>
              <Button type="submit" variant="danger" isLoading={isProcessingStatus}>{t("admin.users.resetPassword")}</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Edit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showEditConfirm}
        onClose={() => setShowEditConfirm(false)}
        onConfirm={executeUpdateUser}
        title="Confirm Account Modification"
        description={`You are about to modify the account of "${userToEdit?.name}". The user will receive an email and in-app notification informing them of this change. Are you sure?`}
        confirmLabel="Yes, Save Changes"
        variant="warning"
        isLoading={isProcessingStatus}
      />
      </>
      )}

      {activeTab === "BLOCKLIST" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setIsAddBlocklistModalOpen(true)} size="sm">
              <UserX className="h-4 w-4 mr-2" />
              Add to Blocklist
            </Button>
          </div>
          <div className="admin-table-container">
            <table className="admin-table stacked-table">
              <thead className="admin-table-header">
                <tr>
                  <th>Email</th>
                  <th>Reason to block</th>
                  <th>Date Blocked</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isFetchingBlocklist ? (
                  <tr className="empty-row"><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : blocklist.length === 0 ? (
                  <tr className="empty-row"><td colSpan={4} className="text-center py-8 text-gray-400">No blocked emails.</td></tr>
                ) : (
                  blocklist.map(item => (
                    <tr key={item.id} className="admin-table-row">
                      <td data-label="Email" className="font-medium text-gray-900 dark:text-white">{item.email}</td>
                      <td data-label="Reason to block" className="text-gray-500 dark:text-gray-400 max-w-md truncate">{item.reason || "N/A"}</td>
                      <td data-label="Date Blocked" className="text-[12px] text-gray-500 dark:text-gray-400">{format(new Date(item.createdAt), "MMM d, yyyy")}</td>
                      <td data-label="Actions" className="text-right">
                        <Button variant="outline" size="sm" onClick={() => handleUnblock(item)}>
                          Unblock
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

      {activeTab === "TEAMS" && (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50 flex justify-between items-center">
            <h2 className="text-[14px] font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              Student Teams
            </h2>
          </div>
          
          <div className="admin-table-container">
            <table className="admin-table stacked-table">
              <thead className="admin-table-header">
                <tr className={isRTL ? "text-right" : "text-left"}>
                  <th className={isRTL ? "text-right" : "text-left"}>Leader & Reason</th>
                  <th>Department</th>
                  <th>Members</th>
                  <th>Date Created</th>
                </tr>
              </thead>
              <tbody>
                {isFetchingTeams ? (
                  <tr className="empty-row"><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
                ) : teams.length === 0 ? (
                  <tr className="empty-row"><td colSpan={4} className="text-center py-8 text-gray-400">No teams have been formed yet.</td></tr>
                ) : (
                  teams.map(team => {
                    const leader = team.members.find((m: any) => m.isLeader)?.student;
                    return (
                      <tr key={team.id} className="admin-table-row">
                        <td data-label="Leader & Reason" className="font-medium text-gray-900 dark:text-white">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold">{leader?.name || "Unknown"} (Leader)</span>
                            <span className="text-[12px] text-gray-500 font-normal italic truncate max-w-xs">{team.reason || "No reason provided"}</span>
                          </div>
                        </td>
                        <td data-label="Department" className="text-gray-500 dark:text-gray-400">{team.filiere?.name || "N/A"}</td>
                        <td data-label="Members" className="text-gray-500 dark:text-gray-400">
                          <div className="flex flex-col gap-1">
                            {team.members.map((m: any) => (
                              <span key={m.id} className="text-[12px] bg-gray-100 px-2 py-0.5 rounded max-w-max text-gray-800">
                                {m.student.name} {m.isLeader ? "(L)" : ""}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td data-label="Date Created" className="text-[12px] text-gray-500 dark:text-gray-400">{format(new Date(team.createdAt), "MMM d, yyyy")}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Blocklist Modal */}
      <Modal
        isOpen={isAddBlocklistModalOpen}
        onClose={() => {
          setIsAddBlocklistModalOpen(false);
          setNewBlockedEmail("");
          setNewBlockedReason("");
        }}
        title={t("admin.users.blockEmailTitle")}
        size="sm"
      >
        <form onSubmit={handleAddBlocklist} className="space-y-4 py-2">
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/50 p-3 rounded-md text-[13px] text-amber-800 dark:text-amber-400 leading-snug">
            {t("admin.users.blockEmailHint")}
          </div>
          
          <Input
            label={t("common.email")}
            type="email"
            placeholder="e.g., student@example.com"
            value={newBlockedEmail}
            onChange={(e) => setNewBlockedEmail(e.target.value)}
            required
          />
          
          <div>
            <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 block mb-2 uppercase tracking-wide">
              {t("admin.users.reasonToBlock")}
            </label>
            <textarea
              className={`admin-input h-24 pt-2 resize-none ${isRTL ? "text-right" : "text-left"}`}
              placeholder="e.g., Suspicious activity, expelled student..."
              value={newBlockedReason}
              onChange={(e) => setNewBlockedReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddBlocklistModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isProcessingStatus}>
              {t("common.submit")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Admin Modal */}
      <Modal
        isOpen={isAddAdminModalOpen}
        onClose={() => setIsAddAdminModalOpen(false)}
        title={t("admin.users.createAdminTitle")}
        size="md"
      >
        <form onSubmit={handleCreateAdmin} className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("common.fullName")}
              placeholder="e.g., John Doe"
              value={newAdminData.name}
              onChange={(e) => setNewAdminData({ ...newAdminData, name: e.target.value })}
              required
            />
            <Input
              label={t("common.email")}
              type="email"
              placeholder="yourname@example.com"
              value={newAdminData.email}
              onChange={(e) => setNewAdminData({ ...newAdminData, email: e.target.value })}
              required
            />
          </div>

          <Input
            label={t("common.password")}
            type="password"
            placeholder="Min. 12 characters + 1 number"
            value={newAdminData.password}
            onChange={(e) => setNewAdminData({ ...newAdminData, password: e.target.value })}
            required
          />

          <div className="pt-2">
            <div className="flex items-center justify-between p-3 border border-gray-100 dark:border-slate-800 rounded-lg bg-gray-50/30 dark:bg-slate-800/20">
              <div className={isRTL ? "text-right" : "text-left"}>
                <span className="text-[13px] font-semibold text-gray-900 dark:text-white block">{t("admin.users.makeSuperAdmin")}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{t("admin.users.superAdminDesc")}</span>
              </div>
              <button
                type="button"
                onClick={() => setNewAdminData({ ...newAdminData, isSuperAdmin: !newAdminData.isSuperAdmin, filiereId: !newAdminData.isSuperAdmin ? "" : newAdminData.filiereId })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${newAdminData.isSuperAdmin ? "bg-indigo-600" : "bg-gray-300 dark:bg-slate-700"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 shadow-sm ${newAdminData.isSuperAdmin ? (isRTL ? "-translate-x-6" : "translate-x-6") : (isRTL ? "-translate-x-1" : "translate-x-1")}`} />
              </button>
            </div>
          </div>

          <div className={`space-y-2 mt-4 transition-all duration-300 ${newAdminData.isSuperAdmin ? "opacity-40 grayscale pointer-events-none" : "opacity-100"}`}>
            <label className="text-[12px] font-bold text-gray-700 dark:text-gray-300 block uppercase tracking-wide">
              {t("admin.users.assignedFiliere")} {!newAdminData.isSuperAdmin && <span className="text-red-500">*</span>}
            </label>
            <div className="relative">
              <select
                className={`admin-input ${isRTL ? "text-right pr-10" : "text-left pl-10"}`}
                value={newAdminData.filiereId}
                onChange={(e) => setNewAdminData({ ...newAdminData, filiereId: e.target.value })}
                required={!newAdminData.isSuperAdmin}
                disabled={newAdminData.isSuperAdmin}
              >
                <option value="">{t("admin.users.allRoles")}</option>
                {filieres.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
              <div className={`absolute ${isRTL ? "right-3" : "left-3"} top-1/2 -translate-y-1/2 text-gray-400`}>
                <Building2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
              {t("admin.users.deptAdminHint")}
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-slate-800 mt-4">
            <Button type="button" variant="outline" onClick={() => setIsAddAdminModalOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" isLoading={isProcessingStatus}>
              {t("common.confirm")}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unblock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!emailToUnblock}
        onClose={() => setEmailToUnblock(null)}
        onConfirm={executeUnblock}
        title={t("admin.users.unblockTitle")}
        description={t("admin.users.unblockDesc").replace("{email}", emailToUnblock?.email || "")}
        confirmLabel={t("admin.users.unblockConfirm")}
        variant="warning"
        isLoading={isProcessingStatus}
      />
    </div>
  );
}

