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
  });

  if (!user) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password, ...safeUser } = user;
  return NextResponse.json({ data: safeUser });
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

  if (email && email !== user.email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: "Email already in use" }, { status: 400 });
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

    data.password = await bcrypt.hash(newPassword, 10);
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
