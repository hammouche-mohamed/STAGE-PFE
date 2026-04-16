import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const topicId = searchParams.get("topicId");

  try {
    const where: any = {};
    
    if (session.user.role === "COMPANY") {
      where.topic = { proposedById: session.user.id };
      if (topicId) where.topicId = topicId;
    } else if (session.user.role === "STUDENT") {
      where.leaderId = session.user.id;
    } else if (session.user.role === "ADMIN") {
        if (topicId) where.topicId = topicId;
    }

    const applications = await prisma.studentApplication.findMany({
      where,
      include: {
        topic: { select: { title: true, type: true, status: true } },
        // include leader (student)
        // leader join is via leaderId -> User.id
      },
      orderBy: { appliedAt: "desc" },
    });

    // We need to fetch user details for leader/partner manually if not joined
    // Actually we can join them if we modify the schema or use better queries
    // For now, let's include basic info if possible
    
    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
