import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { MiniPresentationService } from "@/lib/services/miniPresentation.service";

const submitSchema = z.object({
  fileUrl: z.string().min(1),
  fileName: z.string().min(1).max(255),
});

/**
 * Student uploads a document for a milestone they're on. File bytes are
 * persisted upstream (POST /api/upload/document); this endpoint just records
 * the URL/name on the MiniPresentation row and handles the late-submission
 * bookkeeping in the service layer.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Only students can submit milestone documents" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const parsed = submitSchema.parse(body);
    const updated = await MiniPresentationService.submit(
      id,
      { url: parsed.fileUrl, name: parsed.fileName },
      session.user.id,
    );
    return NextResponse.json({ data: updated });
  } catch (err: unknown) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: err.issues }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : "Failed to submit";
    const status = message === "Milestone not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
