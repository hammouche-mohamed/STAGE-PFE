import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const row = await (prisma as any).blockedEmail.findUnique({ where: { id } });
    await (prisma as any).blockedEmail.delete({
      where: { id },
    });

    await AuditService.log({
      userId: session.user.id,
      action: "EMAIL_UNBLOCKED",
      targetType: "BlockedEmail",
      targetId: id,
      details: { email: row?.email ?? null },
    });

    return NextResponse.json({ message: "Email unblocked successfully" });
  } catch (error) {
    console.error("Delete blocked email failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
