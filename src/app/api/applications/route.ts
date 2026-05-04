import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { randomUUID } from "crypto";

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
      include: { topic: { select: { title: true, type: true, status: true } } },
      orderBy: { appliedAt: "desc" },
    });

    return NextResponse.json({ data: applications });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topicId, partnerId } = await req.json();
    if (!topicId) return NextResponse.json({ error: "topicId is required" }, { status: 400 });

    // ── GUARD: already in an active internship ──────────────────────────────
    const activeInternship = await prisma.internshipStudent.findFirst({
      where: {
        studentId: session.user.id,
        internship: { status: { notIn: ["CANCELLED"] } },
      },
      include: { internship: { include: { topic: { select: { title: true } } } } },
    });

    if (activeInternship) {
      return NextResponse.json(
        {
          error: "ALREADY_IN_INTERNSHIP",
          message: `You are already enrolled in "${activeInternship.internship.topic.title}". You can only be in one internship at a time.`,
        },
        { status: 409 },
      );
    }

    // ── GUARD: already applied to this topic ────────────────────────────────
    const existingApp = await prisma.studentApplication.findFirst({
      where: { topicId, leaderId: session.user.id, status: { not: "REJECTED" } },
    });
    if (existingApp) {
      return NextResponse.json({ error: "You already applied to this topic." }, { status: 409 });
    }

    // ── GUARD: topic must be open ────────────────────────────────────────────
    const topic = await prisma.topic.findUnique({ where: { id: topicId } });
    if (!topic || topic.status !== "OPEN_FOR_SELECTION") {
      return NextResponse.json({ error: "This topic is no longer available." }, { status: 409 });
    }

    const application = await prisma.studentApplication.create({
      data: {
        id: randomUUID(),
        topicId,
        leaderId: session.user.id,
        // Bug fix: persist partnerId so the binôme flow can read it later
        partnerId: partnerId || null,
        isBinome: !!partnerId,
        status: "PENDING",
      },
    });

    return NextResponse.json({ data: application }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to apply" }, { status: 500 });
  }
}
