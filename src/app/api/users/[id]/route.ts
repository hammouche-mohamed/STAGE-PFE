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
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Manually fetch profiles since relations are missing in schema
    const [studentProfile, teacherProfile, companyProfile, adminProfile] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: id } }),
      prisma.teacherProfile.findUnique({ where: { userId: id } }),
      prisma.companyProfile.findUnique({ where: { userId: id } }),
      prisma.adminProfile.findUnique({ where: { userId: id } }),
    ]);

    const { password, ...safeUser } = user;
    return NextResponse.json({ 
      data: {
        ...safeUser,
        studentProfile,
        teacherProfile,
        companyProfile,
        adminProfile
      } 
    });
  } catch (error) {
    console.error("Fetch user error:", error);
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

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

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

    // Perform updates in a transaction
    const updatedUser = await prisma.$transaction(async (tx) => {
      // 1. Update the main user record
      const newUser = await tx.user.update({
        where: { id },
        data: updateData
      });

      // 2. Update the profile record if provided
      if (profileData) {
        // Sanitize profile data (remove internal fields and handle empty strings)
        const sanitizedData: any = {};
        Object.keys(profileData).forEach(key => {
          if (!['id', 'userId', 'createdAt', 'updatedAt'].includes(key)) {
            // Strip isSuperAdmin for non-admin profiles to prevent schema errors
            if (key === 'isSuperAdmin' && newUser.role !== 'ADMIN') return;
            
            // Convert empty string to null for foreign keys
            sanitizedData[key] = profileData[key] === "" ? null : profileData[key];
          }
        });

        if (newUser.role === "STUDENT") {
          await tx.studentProfile.upsert({
            where: { userId: id },
            create: { ...sanitizedData, userId: id },
            update: sanitizedData
          });
        } else if (newUser.role === "TEACHER") {
          await tx.teacherProfile.upsert({
            where: { userId: id },
            create: { ...sanitizedData, userId: id },
            update: sanitizedData
          });
        } else if (newUser.role === "COMPANY") {
          await tx.companyProfile.upsert({
            where: { userId: id },
            create: { ...sanitizedData, userId: id },
            update: sanitizedData
          });
        } else if (newUser.role === "ADMIN") {
          await tx.adminProfile.upsert({
            where: { userId: id },
            create: { ...sanitizedData, userId: id },
            update: sanitizedData
          });
        }
      }

      return newUser;
    });

    // Send in-app notification to the modified user
    if (notifyUser) {
      const modifications = [];
      if (name && name !== existingUser.name) modifications.push(`• Name changed to: ${name}`);
      if (email && email !== existingUser.email) modifications.push(`• Email changed to: ${email}`);
      if (role && role !== existingUser.role) modifications.push(`• System role changed to: ${role}`);
      if (typeof isActive === "boolean" && isActive !== existingUser.isActive) {
        modifications.push(`• Account status changed to: ${isActive ? 'ACTIVE' : 'INACTIVE'}`);
      }

      const modMessage = modifications.length > 0 
        ? `The following changes were made to your account:\n\n${modifications.join('\n')}\n\nPlease review your profile and contact administration if you have concerns.`
        : "An administrator has modified your account information. Please review your profile. Contact administration if you have concerns.";

      const { NotificationService } = await import("@/lib/services/notification.service");
      await NotificationService.trigger({
        userId: id,
        type: "ACCOUNT_MODIFIED",
        title: "Your Account Was Updated",
        message: modMessage,
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
  } catch (error: any) {
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
