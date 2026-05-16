import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const filieres = await prisma.filiere.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, isActive: true },
    });
    const response = NextResponse.json({ data: filieres });
    response.headers.set(
      "Cache-Control",
      "public, max-age=300, stale-while-revalidate=600",
    );
    return response;
  } catch {
    return NextResponse.json({ error: "Failed to load filières" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN" || !session.user.isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: Only Super Admins can manage departments" }, { status: 403 });
  }
  try {
    const { name, code } = await req.json();
    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: "Name must be at least 2 characters" }, { status: 400 });
    }
    const filiere = await prisma.filiere.create({
      data: { id: randomUUID(), name: name.trim(), code: code?.trim() || null },
    });
    return NextResponse.json({ data: filiere }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "A filière with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to create filière" }, { status: 500 });
  }
}
