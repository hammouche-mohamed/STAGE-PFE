import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { MiniPresentationService } from "@/lib/services/miniPresentation.service";
import prisma from "@/lib/prisma";

const scheduleSchema = z.object({
  internshipId: z.string().min(1),
  title: z.string().min(2).max(200),
  scheduledAt: z.string().datetime(),
  room: z.string().min(1).max(120),
  timeSlot: z.string().min(1).max(60),
  documentDeadline: z.string().datetime(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  try {
    if (role === "ADMIN") {
      const filiereId = session.user.isSuperAdmin ? null : session.user.filiereId;
      const data = await MiniPresentationService.list(filiereId);
      return NextResponse.json({ data });
    }
    if (role === "TEACHER") {
      const data = await prisma.miniPresentation.findMany({
        where: { internship: { teacherId: session.user.id } },
        include: {
          internship: { select: { topic: { select: { title: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
      });
      return NextResponse.json({ data });
    }
    if (role === "STUDENT") {
      const data = await prisma.miniPresentation.findMany({
        where: {
          internship: { internshipstudent: { some: { studentId: session.user.id } } },
        },
        include: {
          internship: { select: { topic: { select: { title: true } } } },
        },
        orderBy: { scheduledAt: "asc" },
      });
      return NextResponse.json({ data });
    }
    return NextResponse.json({ data: [] });
  } catch (err) {
    console.error("[mini-presentations GET]", err);
    return NextResponse.json({ error: "Failed to load mini-presentations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = scheduleSchema.parse(body);
    const created = await MiniPresentationService.schedule(
      {
        ...parsed,
        scheduledAt: new Date(parsed.scheduledAt),
        documentDeadline: new Date(parsed.documentDeadline),
      },
      session.user.id,
    );
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to schedule";
    const status = message === "Internship not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
