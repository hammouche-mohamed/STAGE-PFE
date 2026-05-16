import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const settings = await prisma.systemSettings.findMany();
    return NextResponse.json({ data: settings });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: SuperAdmin only" }, { status: 403 });
  }

  try {
    const { key, value } = await req.json();

    if (!key || value === undefined) {
      return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
    }

    const now = new Date();
    const setting = await prisma.systemSettings.upsert({
      where: { key },
      update: {
        value: String(value),
        updatedAt: now
      },
      create: {
        id: randomUUID(),
        key,
        value: String(value),
        updatedAt: now
      }
    });

    revalidateTag("settings");

    try {
      await AuditService.log({
        userId: session.user.id,
        action: "SETTING_UPDATED",
        targetType: "SystemSettings",
        targetId: key,
        details: { key, value }
      });
    } catch (auditError) {
      console.error("Failed to log audit for settings update:", auditError);
    }

    return NextResponse.json({ data: setting });
  } catch (error: any) {
    console.error("Settings update error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error.message || "Unknown error"
    }, { status: 500 });
  }
}
