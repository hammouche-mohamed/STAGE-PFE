import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { NotificationService } from "@/lib/services/notification.service";
import { randomUUID } from "crypto";
import { revalidateTag } from "next/cache";
import { addDays, differenceInDays } from "date-fns";

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
    // The dashboard layout caches the university logo under this tag; deleting
    // / changing it here must invalidate that cache too.
    revalidateTag("systemSettings");

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

    // When the super admin updates the global PFE end date, every active PFE
    // internship must be realigned: end date AND final report deadline both
    // jump to the new date. Midterm is recomputed from the existing start +
    // new end. Completed/cancelled internships are left alone (historical).
    let propagated = 0;
    if (key === "pfeEndDate" && value) {
      const newEnd = new Date(String(value));
      if (!Number.isNaN(newEnd.getTime())) {
        const activePfe = await prisma.internship.findMany({
          where: {
            internshipType: "PFE",
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          select: {
            id: true,
            startDate: true,
            teacherId: true,
            topic: { select: { title: true } },
            internshipstudent: { select: { studentId: true } },
          },
        });

        await Promise.all(
          activePfe.map(async (i) => {
            const data: Record<string, any> = {
              endDate: newEnd,
              finalDeadline: newEnd,
              updatedAt: new Date(),
            };
            // Only recompute midterm if the internship has actually started
            // (start date is set). Use floor(duration/2) — the same rule
            // calculateDeadlines uses on activation.
            if (i.startDate) {
              const duration = differenceInDays(newEnd, i.startDate);
              if (duration > 0) {
                data.midtermDeadline = addDays(i.startDate, Math.floor(duration / 2));
              }
            }
            await prisma.internship.update({ where: { id: i.id }, data });
            propagated++;

            // Tell everyone whose deadline just shifted.
            const recipients = [
              ...i.internshipstudent.map((s) => s.studentId),
              i.teacherId,
            ];
            await Promise.all(
              recipients.map((userId) =>
                NotificationService.trigger({
                  userId,
                  type: "DEADLINE_APPROACHING",
                  title: "PFE Deadline Updated",
                  message: `The PFE end date and final report deadline for "${i.topic.title}" have been updated to ${newEnd.toLocaleDateString()}.`,
                  relatedId: i.id,
                  relatedType: "Internship",
                }).catch(() => null),
              ),
            );
          }),
        );
      }
    }

    return NextResponse.json({ data: setting, propagated });
  } catch (error: any) {
    console.error("Settings update error:", error);
    return NextResponse.json({
      error: "Internal server error",
      message: error.message || "Unknown error"
    }, { status: 500 });
  }
}
