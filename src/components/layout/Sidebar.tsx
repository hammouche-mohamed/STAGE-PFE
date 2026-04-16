"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  Briefcase, 
  FileText, 
  MessageSquare, 
  Milestone, 
  Bell, 
  Users, 
  Settings, 
  History, 
  Calendar,
  ShieldCheck,
  UserPlus 
} from "lucide-react";
import Image from "next/image";

export interface SidebarProps {
  role: "STUDENT" | "TEACHER" | "COMPANY" | "ADMIN";
}

interface NavItem {
  label: string;
  href: string;
  icon: any;
  group?: string;
}

const navigations: Record<string, NavItem[]> = {
  STUDENT: [
    { label: "Dashboard", href: "/student", icon: LayoutDashboard },
    { label: "Find Topics", href: "/student/topics", icon: BookOpen },
    { label: "My Internship", href: "/student/internship", icon: Briefcase },
    { label: "Documents", href: "/student/documents", icon: FileText },
    { label: "Messages", href: "/student/messages", icon: MessageSquare },
    { label: "Milestones", href: "/student/milestones", icon: Milestone },
  ],
  TEACHER: [
    { label: "Dashboard", href: "/teacher", icon: LayoutDashboard },
    { label: "Supervisions", href: "/teacher/internships", icon: Briefcase },
    { label: "Documents", href: "/teacher/documents", icon: FileText },
    { label: "Evaluations", href: "/teacher/evaluations", icon: Milestone },
    { label: "Messages", href: "/teacher/messages", icon: MessageSquare },
  ],
  COMPANY: [
    { label: "Dashboard", href: "/company", icon: LayoutDashboard },
    { label: "My Topics", href: "/company/topics", icon: BookOpen },
    { label: "Applications", href: "/company/applications", icon: UserPlus },
    { label: "Active Internships", href: "/company/internships", icon: Briefcase },
    { label: "Messages", href: "/company/messages", icon: MessageSquare },
  ],
  ADMIN: [
    { label: "Overview", href: "/admin", icon: LayoutDashboard },
    { label: "Registrations", href: "/admin/registrations", icon: UserPlus, group: "MANAGEMENT" },
    { label: "Users", href: "/admin/users", icon: Users, group: "MANAGEMENT" },
    { label: "Topics", href: "/admin/topics", icon: BookOpen, group: "ACADEMIC" },
    { label: "Internships", href: "/admin/internships", icon: Briefcase, group: "ACADEMIC" },
    { label: "Milestones", href: "/admin/milestones", icon: Milestone, group: "ACADEMIC" },
    { label: "Defenses", href: "/admin/defenses", icon: ShieldCheck, group: "ACADEMIC" },
    { label: "Deadlines", href: "/admin/deadlines", icon: Calendar, group: "SYSTEM" },
    { label: "Settings", href: "/admin/settings", icon: Settings, group: "SYSTEM" },
    { label: "Audit Logs", href: "/admin/audit", icon: History, group: "SYSTEM" },
  ],
};

export const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const pathname = usePathname();
  const navItems: NavItem[] = navigations[role] || [];

  const groupedItems = navItems.reduce((acc, item) => {
    const groupName = item.group || "MAIN";
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {} as Record<string, NavItem[]>);

  return (
    <aside className="w-[240px] fixed left-0 top-0 bottom-0 bg-white border-r border-gray-200 flex flex-col z-50">
      {/* Branding */}
      <div className="h-[70px] px-6 flex items-center gap-3 border-b border-gray-100">
        <div className="h-11 w-11 flex items-center justify-center flex-shrink-0">
          <img 
            src="/esst-logo.png" 
            alt="ESST Logo" 
            className="h-full w-full object-contain"
          />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-[14px] font-bold text-gray-900 leading-none truncate">ESST - Alger</span>
          <span className="text-[9px] text-gray-500 uppercase tracking-widest font-semibold mt-1 truncate">PFE Management</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {Object.entries(groupedItems).map(([group, items]) => (
          <div key={group} className="mb-4">
            {group !== "MAIN" && (
              <div className="px-6 mb-1 text-[10px] font-medium text-gray-400 tracking-[0.1em] uppercase">
                {group}
              </div>
            )}
            {items.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center h-[36px] px-6 text-[13px] transition-colors
                    ${isActive 
                      ? "bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600 font-medium" 
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-2 border-transparent"
                    }`}
                >
                  <Icon className={`mr-3 h-[16px] w-[16px] ${isActive ? "text-indigo-600" : "text-gray-400"}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User Session Footer */}
      <div className="p-4 border-t border-gray-100 flex items-center">
        <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[13px] font-semibold mr-3">
          JD
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-gray-900 truncate">John Doe</p>
          <div className="inline-flex px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-medium text-gray-500 uppercase">
            {role}
          </div>
        </div>
      </div>
    </aside>
  );
};
