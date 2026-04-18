import React from "react";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { 
  Users, 
  UserPlus, 
  Briefcase, 
  BookOpen, 
  ArrowRight,
  ShieldCheck,
  Calendar,
  Clock,
  Bell
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { format } from "date-fns";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SettingsService } from "@/lib/services/settings.service";

export default async function AdminDashboardPage() {
  // Fetch statistics
  // Using type assertion to handle potential casing issues between client generations
  const [
    studentCount,
    teacherCount,
    companyCount,
    activeInternships,
    pendingRegistrations,
    recentTopics,
    currentAcademicYear
  ] = await Promise.all([
    prisma.user.count({ where: { role: "STUDENT" } }),
    prisma.user.count({ where: { role: "TEACHER" } }),
    prisma.user.count({ where: { role: "COMPANY" } }),
    prisma.internship.count({ where: { status: "IN_PROGRESS" } }),
    prisma.registrationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5
    }),
    prisma.topic.count({ where: { status: "PENDING_ADMIN" } }),
    SettingsService.getCurrentAcademicYear(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[17px] font-semibold text-gray-900">Platform Overview</h1>
          <p className="text-[13px] text-gray-500 mt-0.5">Welcome back, Administrator. Here's what's happening today.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm">
            <Calendar className="h-4 w-4 text-gray-400 mr-2" />
            <span className="text-[12px] font-medium text-gray-600">Academic Year: {currentAcademicYear}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          label="Total Students" 
          value={studentCount} 
          icon={Users}
          subValue="Active profiles"
        />
        <StatsCard 
          label="Total Teachers" 
          value={teacherCount} 
          icon={ShieldCheck}
          subValue="Faculty members"
        />
        <StatsCard 
          label="Partner Companies" 
          value={companyCount} 
          icon={Briefcase}
          subValue="Industrial partners"
        />
        <StatsCard 
          label="Active Internships" 
          value={activeInternships} 
          icon={Clock}
          subValue="Currently ongoing"
          subValueColor="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Registrations */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-gray-900 flex items-center">
              <UserPlus className="h-4 w-4 mr-2 text-indigo-600" />
              Registration Requests
            </h2>
            <Link 
              href="/admin/registrations" 
              className="text-[12px] font-medium text-indigo-600 hover:text-indigo-700 flex items-center"
            >
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </div>

          <div className="admin-table-container">
            <table className="admin-table">
              <thead className="admin-table-header">
                <tr>
                  <th>Applicant</th>
                  <th>Role</th>
                  <th>Submitted</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingRegistrations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-gray-400">No pending registrations at the moment.</td>
                  </tr>
                ) : (
                  pendingRegistrations.map((req) => (
                    <tr key={req.id} className="admin-table-row">
                      <td>
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900">{req.name}</span>
                          <span className="text-[11px] text-gray-400">{req.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="text-[12px] font-medium text-gray-600 uppercase tracking-tighter">{req.role}</span>
                      </td>
                      <td>
                        <span className="text-[12px] text-gray-500">{format(new Date(req.createdAt), "MMM d, HH:mm")}</span>
                      </td>
                      <td className="text-right">
                        <Link 
                          href="/admin/registrations"
                          className="text-[12px] font-medium text-indigo-600 hover:underline"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Alerts */}
        <div className="space-y-4">
          <h2 className="text-[14px] font-semibold text-gray-900 flex items-center">
            <Bell className="h-4 w-4 mr-2 text-amber-500" />
            System Status
          </h2>
          
          <div className="bg-white border border-gray-200 rounded-md p-4 space-y-4 shadow-sm">
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-md">
              <div className="p-1.5 bg-amber-100 rounded">
                <BookOpen className="h-4 w-4 text-amber-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-amber-900">{recentTopics} Topics Pending</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Admin approval required for company topics.</p>
                <Link href="/admin/topics" className="text-[11px] font-bold text-amber-800 uppercase mt-2 block hover:underline">
                  Go to Topics
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-indigo-50 border border-indigo-100 rounded-md">
              <div className="p-1.5 bg-indigo-100 rounded">
                <Briefcase className="h-4 w-4 text-indigo-700" />
              </div>
              <div>
                <p className="text-[13px] font-medium text-indigo-900">Final Defense Period</p>
                <p className="text-[11px] text-indigo-700 mt-0.5">Scheduling for June session is open.</p>
                <Link href="/admin/defenses" className="text-[11px] font-bold text-indigo-800 uppercase mt-2 block hover:underline">
                  Manage Scheduling
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


