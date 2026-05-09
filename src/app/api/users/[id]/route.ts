import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import bcrypt from "bcryptjs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        studentProfile: true,
        teacherProfile: true,
        companyProfile: true,
        adminProfile: true,
      }
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const { password, ...safeUser } = user;
    return NextResponse.json({ data: safeUser });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive, name, email, role, password, profileData, notifyUser } = body;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { studentProfile: true, teacherProfile: true, companyProfile: true },
    });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const updateData: any = { updatedAt: new Date() };
    if (typeof isActive === "boolean") {
      if (id === session.user.id && isActive === false) {
        return NextResponse.json({ error: "You cannot deactivate your own account" }, { status: 400 });
      }
      updateData.isActive = isActive;
    }
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      updateData.mustChangePassword = true;
    }

    if (profileData) {
      if (user.role === "STUDENT" && user.studentProfile) {
        updateData.studentProfile = { update: profileData };
      } else if (user.role === "TEACHER" && user.teacherProfile) {
        updateData.teacherProfile = { update: profileData };
      } else if (user.role === "COMPANY" && user.companyProfile) {
        updateData.companyProfile = { update: profileData };
      }
    }

    const updatedUser = await prisma.user.update({ where: { id }, data: updateData });

    // Send in-app notification to the modified user
    if (notifyUser) {
      const { NotificationService } = await import("@/lib/services/notification.service");
      await NotificationService.trigger({
        userId: id,
        type: "ACCOUNT_MODIFIED",
        title: "Your Account Was Updated",
        message: "An administrator has modified your account information. Please review your profile. Contact administration if you have concerns.",
        relatedId: id,
        relatedType: "User",
        link: "/profile",
      });
    }

    await AuditService.log({
      userId: session.user.id,
      action: "USER_UPDATED_BY_ADMIN",
      targetType: "User",
      targetId: updatedUser.name,
      details: { fieldsChanged: Object.keys(body), newStatus: isActive },
    });

    return NextResponse.json({ data: updatedUser });
  } catch (error) {
    console.error("User update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    
    // Check if user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Prevent deleting self
    if (user.id === session.user.id) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
    }

    await prisma.user.delete({ where: { id } });

    await AuditService.log({
      userId: session.user.id,
      action: "USER_DELETED_BY_ADMIN",
      targetType: "User",
      targetId: user.name,
      details: { email: user.email }
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
