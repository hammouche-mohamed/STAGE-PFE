import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ConventionService } from "@/lib/services/convention.service";
import { AuditService } from "@/lib/services/audit.service";

/**
 * GET /api/internships/[id]/convention
 *
 * FR-A4: Generate the official internship convention as a PDF.
 * Restricted to admins (any role) — students/teachers/companies receive
 * a copy only after the admin has signed and dispatched it.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const pdf = await ConventionService.generate(id);

    // Best-effort audit — never block the download on logging failure.
    AuditService.log({
      userId: session.user.id,
      action: "CONVENTION_GENERATED",
      targetType: "Internship",
      targetId: id,
    }).catch((err) => console.error("[convention] audit log failed:", err));

    return new NextResponse(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="convention_${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[convention] generation failed:", err);
    if (message === "Internship not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to generate convention" }, { status: 500 });
  }
}
