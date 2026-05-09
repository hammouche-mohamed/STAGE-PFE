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
  
  const [activeTab, setActiveTab] = useState<"USERS" | "BLOCKLIST">("USERS");
  const [blocklist, setBlocklist] = useState<any[]>([]);
  const [isFetchingBlocklist, setIsFetchingBlocklist] = useState(false);
  const [isAddBlocklistModalOpen, setIsAddBlocklistModalOpen] = useState(false);
  const [newBlockedEmail, setNewBlockedEmail] = useState("");
  const [newBlockedReason, setNewBlockedReason] = useState("");
  const [emailToUnblock, setEmailToUnblock] = useState<any | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.data || []);
    } catch (error) {
      toast.error(t("toast.loadUsersFailed"));
    } finally {
      setIsLoading(false);
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

  useEffect(() => {
    fetchUsers();
    fetchBlocklist();
  }, []);

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
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || 
                         u.email.toLowerCase().includes(search.toLowerCase());
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

  const handleFetchDetail = async (userId: string, target: 'view' | 'edit') => {
    setIsFetchingDetail(true);
    try {
      const res = await fetch(`/api/users/${userId}`);
      const data = await res.json();
      if (!res.ok) throw new Error("Failed to fetch user details");
      
      if (target === 'view') setUserToView(data.data);
      else setUserToEdit({
        ...data.data,
        profileData: data.data.studentProfile || data.data.teacherProfile || data.data.companyProfile || {}
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
    } catch (error) {
      toast.error(t("toast.saveFailed"));
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPasswordValue.length < 6) {
      toast.error(t("toast.passwordTooShort"));
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
          <h1 className="text-[16px] sm:text-[17px] font-semibold text-gray-900">{t("admin.users.title")}</h1>
          <p className="text-[12px] sm:text-[13px] text-gray-500 mt-0.5">{t("admin.users.subtitle")}</p>
        </div>
      </div>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`pb-3 px-4 text-[13px] font-medium transition-colors border-b-2 ${
            activeTab === "USERS" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setActiveTab("USERS")}
        >
          Users
        </button>
        <button
          className={`pb-3 px-4 text-[13px] font-medium transition-colors border-b-2 ${
            activeTab === "BLOCKLIST" ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          }`}
          onClick={() => setActiveTab("BLOCKLIST")}
        >
          Blocked Emails
        </button>
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
      <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
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
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[12px] font-bold overflow-hidden flex-shrink-0">
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
                      <div className="flex flex-col min-w-0 items-start">
                        <span className="font-medium text-gray-900 truncate">{user.name}</span>
                        <span className="text-[11px] text-gray-400 flex items-center truncate">
                          <Mail className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </span>
                      </div>
                    </div>
                  </td>
                  <td data-label="Role">
                    <div className="flex items-center gap-2">
                      <span className="flex-shrink-0">{roleIcons[user.role]}</span>
                      <span className="text-[11px] sm:text-[12px] font-medium text-gray-600 uppercase tracking-tight">{user.role}</span>
                    </div>
                  </td>
                  <td data-label={t("common.status")}>
                    <div className="flex items-center">
                      <div className={`h-1.5 w-1.5 rounded-full ${isRTL ? "ml-1.5" : "mr-1.5"} flex-shrink-0 ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className={`text-[11px] sm:text-[12px] font-medium ${user.isActive ? "text-green-700" : "text-red-700"}`}>
                        {user.isActive ? t("admin.users.active") : t("admin.users.inactive")}
                      </span>
                    </div>
                  </td>
                  <td data-label="Created">
                    <span className="text-[12px] text-gray-500">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </span>
                  </td>
                  <td data-label="Actions" className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {user.id !== currentUserId && (
                        <button 
                          onClick={() => toggleUserStatus(user)}
                          className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${user.isActive ? "text-red-600" : "text-green-600"}`}
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                        </button>
                      )}
                      <div className="relative">
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === user.id ? null : user.id)}
                          className={`p-1.5 rounded transition-colors ${activeMenuId === user.id ? "bg-gray-100 text-indigo-600" : "text-gray-400 hover:text-gray-600"}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>

                        {activeMenuId === user.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className={`absolute right-0 ${index > filteredUsers.length - 3 ? 'bottom-full mb-1' : 'mt-1'} w-44 bg-white border border-gray-100 rounded-lg shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100`}>
                              <button 
                                onClick={() => handleFetchDetail(user.id, 'edit')}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Edit className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"} text-gray-400`} />
                                {t("admin.users.editAccount")}
                              </button>
                              <button 
                                onClick={() => handleFetchDetail(user.id, 'view')}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Eye className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"} text-gray-400`} />
                                {t("admin.users.viewProfile")}
                              </button>
                              {user.id !== currentUserId && (
                                <button 
                                  onClick={() => {
                                    setUserToReset(user);
                                    setActiveMenuId(null);
                                  }}
                                  className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                  <Key className={`h-3.5 w-3.5 ${isRTL ? "ml-2" : "mr-2"} text-gray-400`} />
                                  {t("admin.users.resetPassword")}
                                </button>
                              )}
                              {user.id !== currentUserId && (
                                <>
                                  <div className="h-px bg-gray-50 my-1" />
                                  <button 
                                    onClick={() => {
                                      setUserToDelete(user);
                                      setActiveMenuId(null);
                                    }}
                                    className="w-full flex items-center px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
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
            <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
              <div className="h-16 w-16 rounded-full bg-indigo-50 flex items-center justify-center text-[24px] font-bold text-indigo-700 overflow-hidden">
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
                <h3 className="text-[18px] font-bold text-gray-900">{userToView.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <StatusBadge status={userToView.role} />
                  <span className="text-[13px] text-gray-500">{userToView.email}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">{t("common.status")}</label>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${userToView.isActive ? "bg-green-500" : "bg-red-500"}`} />
                  <span className="text-[14px] font-medium">{userToView.isActive ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Member Since</label>
                <p className="text-[14px]">{format(new Date(userToView.createdAt), "MMMM d, yyyy")}</p>
              </div>

              {userToView.role === "STUDENT" && userToView.studentProfile && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Speciality</label>
                    <p className="text-[14px] font-medium">{userToView.studentProfile.speciality}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Promotion</label>
                    <p className="text-[14px]">{userToView.studentProfile.promotion}</p>
                  </div>
                </>
              )}

              {userToView.role === "TEACHER" && userToView.teacherProfile && (
                <>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Grade</label>
                    <p className="text-[14px] font-medium">{userToView.teacherProfile.grade}</p>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Max Students</label>
                    <p className="text-[14px]">{userToView.teacherProfile.maxStudents} Teams</p>
                  </div>
                </>
              )}

              {userToView.role === "COMPANY" && userToView.companyProfile && (
                <>
                  <div className="col-span-2">
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Company Detail</label>
                    <p className="text-[14px] font-medium">{userToView.companyProfile.companyName} - {userToView.companyProfile.sector}</p>
                    <p className="text-[13px] text-gray-500 mt-1">{userToView.companyProfile.address}, {userToView.companyProfile.wilaya}</p>
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
                  <Input
                    label={t("admin.users.speciality")}
                    value={userToEdit.profileData?.speciality || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, speciality: e.target.value}})}
                  />
                  <Input
                    label={t("admin.users.promotion")}
                    value={userToEdit.profileData?.promotion || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, promotion: e.target.value}})}
                  />
                </>
              )}

              {userToEdit.role === "TEACHER" && (
                <>
                  <Input
                    label={t("admin.users.grade")}
                    value={userToEdit.profileData?.grade || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, grade: e.target.value}})}
                  />
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

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
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
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-md text-[13px] text-amber-800 leading-snug">
              {t("admin.users.resetDesc", { name: userToReset.name })}
            </div>

            <Input
              label="New Password"
              type="password"
              placeholder="Min. 6 characters"
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
          <div className="admin-table-container sm:bg-white sm:border sm:border-gray-200 sm:rounded-md">
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
                      <td data-label="Email" className="font-medium text-gray-900">{item.email}</td>
                      <td data-label="Reason to block" className="text-gray-500 max-w-md truncate">{item.reason || "N/A"}</td>
                      <td data-label="Date Blocked" className="text-[12px]">{format(new Date(item.createdAt), "MMM d, yyyy")}</td>
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

      {/* Add Blocklist Modal */}
      <Modal
        isOpen={isAddBlocklistModalOpen}
        onClose={() => {
          setIsAddBlocklistModalOpen(false);
          setNewBlockedEmail("");
          setNewBlockedReason("");
        }}
        title="Block Email Address"
        size="sm"
      >
        <form onSubmit={handleAddBlocklist} className="space-y-4 py-2">
          <div className="bg-amber-50 border border-amber-100 p-3 rounded-md text-[13px] text-amber-800 leading-snug">
            This email address will be permanently prevented from submitting registration requests.
          </div>
          
          <Input
            label="Email Address"
            type="email"
            placeholder="e.g., student@example.com"
            value={newBlockedEmail}
            onChange={(e) => setNewBlockedEmail(e.target.value)}
            required
          />
          
          <div>
            <label className="text-[12px] font-bold text-gray-700 block mb-2 uppercase tracking-wide">
              Reason to block (Optional)
            </label>
            <textarea
              className="admin-input h-24 pt-2 resize-none"
              placeholder="e.g., Suspicious activity, expelled student..."
              value={newBlockedReason}
              onChange={(e) => setNewBlockedReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
            <Button type="button" variant="outline" onClick={() => setIsAddBlocklistModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" isLoading={isProcessingStatus}>
              Block Email
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unblock Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!emailToUnblock}
        onClose={() => setEmailToUnblock(null)}
        onConfirm={executeUnblock}
        title="Unblock Email"
        description={`Are you sure you want to unblock "${emailToUnblock?.email}"? This user will immediately be able to submit new registration requests.`}
        confirmLabel="Yes, Unblock"
        variant="warning"
        isLoading={isProcessingStatus}
      />
    </div>
  );
}

