import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { MiniPresentationService } from "@/lib/services/miniPresentation.service";
import prisma from "@/lib/prisma";

const bulkScheduleSchema = z.object({
  title: z.string().min(2).max(200),
  scheduledAt: z.string().datetime(),
  room: z.string().min(1).max(120),
  timeSlot: z.string().min(1).max(60),
  documentDeadline: z.string().datetime(),
  /** Optional. Dept admins ignore this (their filière is implicit). Super
   *  admins may pass it to scope a bulk milestone to one filière, or omit
   *  it to schedule across every filière at once. */
  filiereId: z.string().min(1).optional().nullable(),
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

/**
 * Bulk-schedule a milestone across an entire filière's active PFE internships.
 * A milestone is a cohort-wide event, so one POST creates N MiniPresentation
 * rows (one per PFE internship). Dept admins are scoped to their own filière
 * automatically; super admins may pass an explicit `filiereId` (or omit it to
 * fan out across every filière at once).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = bulkScheduleSchema.parse(body);

    // Dept admin without a filière can't reach any PFE internships — block
    // early so they don't get a confusing "no internships found" later.
    if (!session.user.isSuperAdmin && !session.user.filiereId) {
      return NextResponse.json(
        { error: "Your admin account has no filière assigned." },
        { status: 403 },
      );
    }

    // Super admin may choose any filière (or all). Dept admin is locked to
    // their own — we ignore the body's filiereId and substitute their own.
    const effectiveFiliereId = session.user.isSuperAdmin
      ? (parsed.filiereId ?? null)
      : session.user.filiereId!;

    const result = await MiniPresentationService.scheduleBulkForFiliere(
      {
        title: parsed.title,
        scheduledAt: new Date(parsed.scheduledAt),
        documentDeadline: new Date(parsed.documentDeadline),
        room: parsed.room,
        timeSlot: parsed.timeSlot,
        filiereId: effectiveFiliereId,
      },
      session.user.id,
    );

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to schedule";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
