import { NextRequest, NextResponse } from "next/server";
import { processPendingDeletions } from "@/lib/services/archiveRetention.service";


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
