import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getArchivedYears,
  getPendingDeletions,
  previewEviction,
} from "@/lib/services/archiveRetention.service";

/**
 * Archive retention status.
 *
 * - GET                  → { archivedYears, pendingDeletions }
 * - GET ?preview=YYYY-YYYY → also { preview: { evictedYear } } telling the
 *   Settings dialog which year WOULD be scheduled for permanent deletion if
 *   the given year were archived now (so the Super Admin is warned first).
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const preview = searchParams.get("preview");

    const [archivedYears, pendingDeletions] = await Promise.all([
      getArchivedYears(),
      getPendingDeletions(),
    ]);

    const body: any = { archivedYears, pendingDeletions };

    if (preview && /^\d{4}-\d{4}$/.test(preview)) {
      body.preview = { evictedYear: await previewEviction(preview) };
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error("Archive status failed:", error);
    return NextResponse.json(
      { error: "Failed to load archive status." },
      { status: 500 },
    );
  }
}
