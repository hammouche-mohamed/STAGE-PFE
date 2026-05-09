import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
    await (prisma as any).blockedEmail.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Email unblocked successfully" });
  } catch (error) {
    console.error("Delete blocked email failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
