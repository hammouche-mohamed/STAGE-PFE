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
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";

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

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      setUsers(data.data || []);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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

      toast.success(newStatus ? "User activated" : "User deactivated");
      setUserToDeactivate(null);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
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

      toast.success("User deleted successfully");
      setUserToDelete(null);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
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
      toast.error("Could not load user details");
    } finally {
      setIsFetchingDetail(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingStatus(true);
    try {
      const res = await fetch(`/api/users/${userToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userToEdit.name,
          email: userToEdit.email,
          role: userToEdit.role,
          profileData: userToEdit.profileData
        }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success("User updated successfully");
      setUserToEdit(null);
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user");
    } finally {
      setIsProcessingStatus(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPasswordValue.length < 6) {
      toast.error("Password must be at least 6 characters");
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
      toast.error("Failed to reset password");
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">User Management</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">View and manage all platform users and their access levels.</p>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="admin-input pl-10"
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
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="TEACHER">Teachers</option>
            <option value="COMPANY">Companies</option>
            <option value="ADMIN">Admins</option>
          </select>
          <Button variant="outline" className="h-[36px]">
            <Filter className="h-4 w-4 mr-2" />
            More Filters
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created At</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">Loading users...</td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-gray-400">No users found matching your filters.</td>
              </tr>
            ) : (
              filteredUsers.map((user, index) => (
                <tr key={user.id} className="admin-table-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center text-[12px] font-bold overflow-hidden">
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
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{user.name}</span>
                        <span className="text-[11px] text-gray-400 flex items-center">
                          <Mail className="h-3 w-3 mr-1" />
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {roleIcons[user.role]}
                      <span className="text-[12px] font-medium text-gray-600 uppercase tracking-tight">{user.role}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center">
                      <div className={`h-1.5 w-1.5 rounded-full mr-2 ${user.isActive ? "bg-green-500" : "bg-red-500"}`} />
                      <span className={`text-[12px] font-medium ${user.isActive ? "text-green-700" : "text-red-700"}`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className="text-[12px] text-gray-500">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </span>
                  </td>
                  <td className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => toggleUserStatus(user)}
                        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${user.isActive ? "text-red-600" : "text-green-600"}`}
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
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
                                <Edit className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                Edit Account
                              </button>
                              <button 
                                onClick={() => handleFetchDetail(user.id, 'view')}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                View Profile
                              </button>
                              <button 
                                onClick={() => {
                                  setUserToReset(user);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-gray-600 hover:bg-gray-50 transition-colors"
                              >
                                <Key className="h-3.5 w-3.5 mr-2 text-gray-400" />
                                Reset Password
                              </button>
                              <div className="h-px bg-gray-50 my-1" />
                              <button 
                                onClick={() => {
                                  setUserToDelete(user);
                                  setActiveMenuId(null);
                                }}
                                className="w-full flex items-center px-4 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                Delete Member
                              </button>
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
        title="Deactivate Account"
        description={`Are you sure you want to deactivate ${userToDeactivate?.name}'s account? This will immediately revoke their access to the platform.`}
        confirmLabel="Deactivate"
        isLoading={isProcessingStatus}
      />

      <ConfirmDialog
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        onConfirm={executeDeleteUser}
        title="Delete User Account"
        description={`Are you sure you want to PERMANENTLY delete ${userToDelete?.name}'s account? This will remove all their data and cannot be undone.`}
        confirmLabel="Delete User"
        variant="danger"
        isLoading={isProcessingStatus}
      />

      {/* View Profile Modal */}
      <Modal
        isOpen={!!userToView}
        onClose={() => setUserToView(null)}
        title="Institutional Profile"
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
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</label>
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
              <Button onClick={() => setUserToView(null)}>Close View</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!userToEdit}
        onClose={() => setUserToEdit(null)}
        title="Edit Account Details"
        size="lg"
      >
        {userToEdit && (
          <form onSubmit={handleUpdateUser} className="space-y-6 py-2">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Full Name"
                value={userToEdit.name}
                onChange={(e) => setUserToEdit({...userToEdit, name: e.target.value})}
              />
              <Input
                label="Email Address"
                type="email"
                value={userToEdit.email}
                onChange={(e) => setUserToEdit({...userToEdit, email: e.target.value})}
              />
              
              <div className="col-span-2 space-y-2">
                <label className="admin-form-label">System Role</label>
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
                    label="Speciality"
                    value={userToEdit.profileData?.speciality || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, speciality: e.target.value}})}
                  />
                  <Input
                    label="Promotion"
                    value={userToEdit.profileData?.promotion || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, promotion: e.target.value}})}
                  />
                </>
              )}

              {userToEdit.role === "TEACHER" && (
                <>
                  <Input
                    label="Grade"
                    value={userToEdit.profileData?.grade || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, grade: e.target.value}})}
                  />
                  <Input
                    label="Max Teams Capacity"
                    type="number"
                    value={userToEdit.profileData?.maxStudents || 5}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, maxStudents: parseInt(e.target.value)}})}
                  />
                </>
              )}

              {userToEdit.role === "COMPANY" && (
                <>
                  <Input
                    label="Company Name"
                    value={userToEdit.profileData?.companyName || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, companyName: e.target.value}})}
                  />
                  <Input
                    label="Sector"
                    value={userToEdit.profileData?.sector || ""}
                    onChange={(e) => setUserToEdit({...userToEdit, profileData: {...userToEdit.profileData, sector: e.target.value}})}
                  />
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-50">
              <Button type="button" variant="outline" onClick={() => setUserToEdit(null)}>Cancel</Button>
              <Button type="submit" isLoading={isProcessingStatus}>Save Changes</Button>
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
        title="Reset User Password"
        size="sm"
      >
        {userToReset && (
          <form onSubmit={handleResetPassword} className="space-y-6 py-2">
            <div className="bg-amber-50 border border-amber-100 p-3 rounded-md text-[13px] text-amber-800 leading-snug">
              Manual reset for <strong>{userToReset.name}</strong>. The user will be required to change this password on their next login.
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
              <Button type="button" variant="outline" onClick={() => setUserToReset(null)}>Cancel</Button>
              <Button type="submit" variant="danger" isLoading={isProcessingStatus}>Confirm Reset</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
