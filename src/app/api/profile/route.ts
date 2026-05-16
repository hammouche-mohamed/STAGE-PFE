import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { AuditService } from "@/lib/services/audit.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true, name: true, email: true, role: true, avatarUrl: true, department: true,
      isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const extendedUser = { ...user } as any;

  if (user.role === 'STUDENT') {
    extendedUser.studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { filiere: true }
    });
  } else if (user.role === 'TEACHER') {
    extendedUser.teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      include: { filiere: true }
    });
  } else if (user.role === 'COMPANY') {
    extendedUser.companyProfile = await prisma.companyProfile.findUnique({
      where: { userId: user.id }
    });
  } else if (user.role === 'ADMIN') {
    extendedUser.adminProfile = await prisma.adminProfile.findUnique({
      where: { userId: user.id },
      include: { filiere: true }
    });
  }

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ data: extendedUser });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, avatarUrl, currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (name !== undefined && typeof name === 'string' && name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  if (newPassword && (newPassword.length < 12 || !/[0-9]/.test(newPassword))) {
    return NextResponse.json({ error: "New password must be at least 12 characters and include at least one number." }, { status: 400 });
  }

  if (email && email !== user.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "This email address is already in use." }, { status: 409 });
    }
  }

  const data: Record<string, any> = {
    name: name ?? user.name,
    email: email ?? user.email,
    updatedAt: new Date(),
  };

  if (Object.prototype.hasOwnProperty.call(body, "avatarUrl")) {
    data.avatarUrl = avatarUrl;
  }

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Current password is required" }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return NextResponse.json({ error: "New password cannot be the same as your current password." }, { status: 400 });
    }

    data.password = await bcrypt.hash(newPassword, 12);
    data.mustChangePassword = false;
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  const changed: string[] = [];
  if (name !== undefined && name !== user.name) changed.push("name");
  if (email !== undefined && email !== user.email) changed.push("email");
  if (newPassword) changed.push("password");
  if (Object.prototype.hasOwnProperty.call(body, "avatarUrl")) changed.push("avatar");

  if (changed.length > 0) {
    await AuditService.log({
      userId: session.user.id,
      action: changed.includes("password") ? "USER_PASSWORD_CHANGED" : "USER_PROFILE_UPDATED",
      targetType: "User",
      targetId: session.user.id,
      details: { fields: changed },
    });
  }

  const { password, ...safeUser } = updatedUser;
  return NextResponse.json({ data: safeUser });
}
