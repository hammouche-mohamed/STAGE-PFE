import { NextRequest, NextResponse } from "next/server";
import { AuditService } from "@/lib/services/audit.service";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deletedCount = await AuditService.cleanupOldLogs();

    await AuditService.log({
      userId: session.user.id,
      action: "MANUAL_AUDIT_CLEANUP",
      targetType: "System",
      targetId: "Audit Records",
      details: { deletedCount }
    });

    return NextResponse.json({ success: true, deletedCount });
  } catch (error) {
    console.error("Cleanup API failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
