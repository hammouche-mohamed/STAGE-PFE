import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: Only Super Admins can manage departments" }, { status: 403 });
  }
  try {
    const { id } = await params;
    // Soft-delete: set isActive = false
    await prisma.filiere.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ message: "Filière deactivated" });
  } catch {
    return NextResponse.json({ error: "Failed to delete filière" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: Only Super Admins can manage departments" }, { status: 403 });
  }
  try {
    const { id } = await params;
    const { name, code, isActive } = await req.json();
    const filiere = await prisma.filiere.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { code }),
        ...(isActive !== undefined && { isActive }),
      },
    });
    return NextResponse.json({ data: filiere });
  } catch {
    return NextResponse.json({ error: "Failed to update filière" }, { status: 500 });
  }
}
