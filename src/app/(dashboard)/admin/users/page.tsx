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
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT" | "COMPANY";
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

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

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (!res.ok) throw new Error("Update failed");

      toast.success(currentStatus ? "User deactivated" : "User activated");
      fetchUsers();
    } catch (error) {
      toast.error("Failed to update user status");
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
              filteredUsers.map((user) => (
                <tr key={user.id} className="admin-table-row">
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-[12px] font-bold text-gray-600">
                        {user.name.charAt(0)}
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
                        onClick={() => toggleUserStatus(user.id, user.isActive)}
                        className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${user.isActive ? "text-red-600" : "text-green-600"}`}
                        title={user.isActive ? "Deactivate" : "Activate"}
                      >
                        {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </button>
                      <button className="p-1.5 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
