import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { z } from "zod";
import { MiniPresentationService } from "@/lib/services/miniPresentation.service";

const patchSchema = z.object({
  title: z.string().min(2).max(200).optional(),
  scheduledAt: z.string().datetime().optional(),
  room: z.string().min(1).max(120).optional(),
  timeSlot: z.string().min(1).max(60).optional(),
  documentDeadline: z.string().datetime().optional(),
  status: z.enum(["SCHEDULED", "DOCUMENT_SUBMITTED", "REVIEWED", "HELD", "POSTPONED", "CANCELLED"]).optional(),
  adminComment: z.string().max(2000).nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const parsed = patchSchema.parse(body);
    const updated = await MiniPresentationService.update(
      id,
      {
        ...parsed,
        scheduledAt: parsed.scheduledAt ? new Date(parsed.scheduledAt) : undefined,
        documentDeadline: parsed.documentDeadline ? new Date(parsed.documentDeadline) : undefined,
      },
      session.user.id,
    );
    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to update";
    const status = message === "Mini-presentation not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  try {
    await MiniPresentationService.remove(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete";
    const status = message === "Mini-presentation not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
