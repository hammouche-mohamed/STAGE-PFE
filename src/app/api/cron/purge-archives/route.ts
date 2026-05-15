import { NextRequest, NextResponse } from "next/server";
import { processPendingDeletions } from "@/lib/services/archiveRetention.service";

/**
 * GET /api/cron/purge-archives
 *
 * Called daily by Vercel Cron. Protected by CRON_SECRET.
 *
 * vercel.json entry:
 * { "crons": [{ "path": "/api/cron/purge-archives", "schedule": "0 6 * * *" }] }
 *
 * For every academic year in the 3-day deletion countdown:
 *  - grace elapsed  → permanently purge that year (irreversible)
 *  - still in grace → send the Super Admin(s) a fresh in-app + email warning
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingDeletions();
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("[CRON] purge-archives failed:", error);
    return NextResponse.json(
      { error: "purge-archives job failed" },
      { status: 500 },
    );
  }
}
