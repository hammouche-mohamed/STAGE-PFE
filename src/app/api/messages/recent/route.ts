import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/messages/recent
// Returns the latest messages from every internship the current user is
// involved in (as student / teacher / company-owner). Used by the student
// dashboard's "Recent messages" widget.
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const userId = session.user.id;
    const role = session.user.role;

    // Resolve which internships this user is a participant of, based on role.
    let internshipIds: string[] = [];

    if (role === "STUDENT") {
      const links = await prisma.internshipStudent.findMany({
        where: { studentId: userId },
        select: { internshipId: true },
      });
      internshipIds = links.map((l) => l.internshipId);
    } else if (role === "TEACHER") {
      const supervised = await prisma.internship.findMany({
        where: { teacherId: userId },
        select: { id: true },
      });
      internshipIds = supervised.map((i) => i.id);
    } else if (role === "COMPANY") {
      const owned = await prisma.internship.findMany({
        where: { topic: { proposedById: userId } },
        select: { id: true },
      });
      internshipIds = owned.map((i) => i.id);
    } else if (role === "ADMIN") {
      // For admin we don't surface a "recent messages" feed by default —
      // they read messages inside a specific internship view.
      return NextResponse.json({ data: [] });
    }

    if (internshipIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const messages = await prisma.message.findMany({
      where: { internshipId: { in: internshipIds } },
      include: { user: { select: { name: true } } },
      orderBy: { sentAt: "desc" },
      take: 5,
    });

    const data = messages.map((m) => ({
      id: m.id,
      content: m.content,
      sentAt: m.sentAt.toISOString(),
      sender: { name: (m as any).user?.name || "Unknown" },
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Fetch recent messages failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
