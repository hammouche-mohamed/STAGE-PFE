import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { MiniPresentationService } from "@/lib/services/miniPresentation.service";
import prisma from "@/lib/prisma";

/**
 * Per-internship slots: each PFE team gets its own presentation time + room,
 * while the document submission deadline is shared on the parent payload.
 */
const slotsScheduleSchema = z.object({
  title: z.string().min(2).max(200),
  documentDeadline: z.string().datetime(),
  slots: z
    .array(
      z.object({
        internshipId: z.string().min(1),
        scheduledAt: z.string().datetime(),
        room: z.string().min(1).max(120),
        timeSlot: z.string().min(1).max(60),
      }),
    )
    .min(1),
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
 * Each internship gets its own presentation time + room from the `slots`
 * array; the document submission deadline is shared (one date for the whole
 * cohort). Dept admin's filière scope is enforced by the GET endpoints that
 * feed the form — the form can only list internships the admin can see, so
 * the slots array is already filtered by the time it lands here.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = slotsScheduleSchema.parse(body);

    // Milestones belong to the department admin — super admin only monitors.
    if (session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: "Milestones are managed by department admins. Super administrators are read-only here." },
        { status: 403 },
      );
    }
    if (!session.user.filiereId) {
      return NextResponse.json(
        { error: "Your admin account has no filière assigned." },
        { status: 403 },
      );
    }

    // For dept admins, verify every slot's internship belongs to their filière.
    // Server-side defence in depth: stops a tampered form from creating
    // milestones on other filières' internships.
    if (!session.user.isSuperAdmin) {
      const allowed = await prisma.internship.findMany({
        where: {
          id: { in: parsed.slots.map((s) => s.internshipId) },
          topic: { filiereId: session.user.filiereId! },
        },
        select: { id: true },
      });
      const allowedIds = new Set(allowed.map((i) => i.id));
      const stray = parsed.slots.find((s) => !allowedIds.has(s.internshipId));
      if (stray) {
        return NextResponse.json(
          { error: "One or more selected internships are outside your filière." },
          { status: 403 },
        );
      }
    }

    const result = await MiniPresentationService.scheduleBulkWithSlots(
      {
        title: parsed.title,
        documentDeadline: new Date(parsed.documentDeadline),
        slots: parsed.slots.map((s) => ({
          internshipId: s.internshipId,
          scheduledAt: new Date(s.scheduledAt),
          room: s.room,
          timeSlot: s.timeSlot,
        })),
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
