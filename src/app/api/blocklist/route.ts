import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const blockedEmails = await (prisma as any).blockedEmail.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: blockedEmails });
  } catch (error) {
    console.error("Fetch blocklist failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { email, reason } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existing = await (prisma as any).blockedEmail.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json({ error: "Email is already blocked" }, { status: 400 });
    }

    const blocked = await (prisma as any).blockedEmail.create({
      data: { email, reason },
    });

    return NextResponse.json({ message: "Email blocked successfully", data: blocked });
  } catch (error) {
    console.error("Add to blocklist failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
