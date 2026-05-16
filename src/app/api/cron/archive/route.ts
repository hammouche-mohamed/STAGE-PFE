import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { addDays } from "date-fns";
import { TeacherLoadService } from "@/lib/services/teacherLoad.service";


export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  try {

    const toArchive = await prisma.internship.findMany({
      where: {
        finalDeadline: { lt: now },
        archivedAt: null,
        status: { in: ["IN_PROGRESS", "COMPLETED", "PENDING_ADMIN_CONFIRMATION"] },
      },
      select: { id: true, finalDeadline: true, teacherId: true },
    });

    if (toArchive.length === 0) {
      return NextResponse.json({ archived: 0, message: "Nothing to archive" });
    }


    const chatArchiveDate = addDays(now, 3);
    await prisma.internship.updateMany({
      where: { id: { in: toArchive.map((i) => i.id) } },
      data: {
        archivedAt: now,
        chatArchivedAt: chatArchiveDate,
        status: "COMPLETED",
      },
    });

    const affectedTeacherIds = Array.from(new Set(toArchive.map((i) => i.teacherId)));
    for (const teacherId of affectedTeacherIds) {
      await TeacherLoadService.recompute(teacherId);
    }

    return NextResponse.json({ archived: toArchive.length, chatArchivedAt: chatArchiveDate });
  } catch (error) {
    console.error("[cron/archive] Error:", error);
    return NextResponse.json({ error: "Archive job failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
