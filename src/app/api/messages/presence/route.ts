import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";


export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { internshipId } = await req.json().catch(() => ({ internshipId: null }));

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        activeChatInternshipId:
          typeof internshipId === "string" && internshipId ? internshipId : null,
        activeChatPingAt: new Date(),
      } as any,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[messages/presence] failed:", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
