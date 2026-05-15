import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Chat presence heartbeat.
 *
 * The ChatWindow pings this while a conversation is open (and once with
 * `internshipId: null` when it closes). When a new message is sent, the
 * messages route checks this so it does NOT push a "New Message" in-app
 * notification to someone who is already looking at that exact chat.
 */
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
    // Presence is best-effort — never block the UI on it.
    console.error("[messages/presence] failed:", error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
