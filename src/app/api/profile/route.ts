import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    // NFR-P2: explicit select — never return the password hash to the client
    select: {
      id: true, name: true, email: true, role: true, avatarUrl: true,
      isActive: true, mustChangePassword: true, createdAt: true, updatedAt: true,
      studentProfile: true, teacherProfile: true, companyProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
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

  // NFR-S5: server-side input validation
  if (name !== undefined && typeof name === 'string' && name.trim().length < 2) {
    return NextResponse.json({ error: "Name must be at least 2 characters." }, { status: 400 });
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  if (newPassword && newPassword.length < 8) {
    return NextResponse.json({ error: "New password must be at least 8 characters." }, { status: 400 });
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

    // NFR-S1: minimum 12 bcrypt salt rounds on every password write
    data.password = await bcrypt.hash(newPassword, 12);
    data.mustChangePassword = false;
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.user.id },
    data,
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = updatedUser;
  return NextResponse.json({ data: safeUser });
}
