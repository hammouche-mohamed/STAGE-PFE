import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { topicSchema } from "@/lib/validations/topic.schema";
import { AuditService } from "@/lib/services/audit.service";
import { addHours } from "date-fns";
import { SettingsService } from "@/lib/services/settings.service";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const validatedData = topicSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Topic
      const topic = await tx.topic.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          requiredSkills: validatedData.requiredSkills,
          type: validatedData.type,
          maxStudents: validatedData.maxStudents,
          academicYear: validatedData.academicYear,
          proposedById: session.user.id,
          assignedTeacherId: validatedData.assignedTeacherId,
          status: "PENDING_ADMIN",
        },
      });

      // 2. Handle Binôme if applicable
      if (validatedData.maxStudents === 2 && validatedData.partnerId) {
        // Find partner student
        const partner = await tx.studentProfile.findUnique({
          where: { studentId: validatedData.partnerId },
          include: { user: true }
        });

        if (!partner) throw new Error("Partner student not found");

        const application = await tx.studentApplication.create({
          data: {
            topicId: topic.id,
            leaderId: session.user.id,
            partnerId: partner.userId,
            status: "PENDING",
          }
        });

        await tx.binomeInvitation.create({
          data: {
            studentApplicationId: application.id,
            invitedStudentId: partner.userId,
            expiresAt: addHours(new Date(), 72),
          }
        });
      }

      // 3. Create initial validation step
      await tx.validation.create({
        data: {
          topicId: topic.id,
          validatorId: "SYSTEM", // Placeholder for initial log or admin pool
          step: "ADMIN",
          status: "PENDING",
        }
      });

      return topic;
    });

    await AuditService.log({
      userId: session.user.id,
      action: "TOPIC_SUBMITTED",
      targetType: "Topic",
      targetId: result.id,
    });

    return NextResponse.json({
      message: "Topic proposal submitted successfully.",
      data: result,
    }, { status: 201 });

  } catch (error: any) {
    console.error("Topic submission failed:", error);
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get("academicYear") || defaultYear;

  try {
    const topics = await prisma.topic.findMany({
      where: {
        academicYear,
        ...(type && { type: type as any }),
        ...(session.user.role === "STUDENT" && { status: "OPEN_FOR_SELECTION" }),
        ...(session.user.role === "COMPANY" && { proposedById: session.user.id }),
      },
      include: {
        proposedBy: { select: { name: true } },
        assignedTeacher: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: topics });
  } catch (error) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}
