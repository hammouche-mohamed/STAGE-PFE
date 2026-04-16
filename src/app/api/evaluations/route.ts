import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { AuditService } from "@/lib/services/audit.service";
import { computeIndividualGrade, computeFinalGrade } from "@/lib/utils/gradeCalculator";
import { computeMention } from "@/lib/utils/mention";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { defenseId, reportScore, technicalScore, oralScore, feedback } = await req.json();

    // 1. Verify jury membership
    const juryMember = await prisma.juryMember.findUnique({
      where: { defenseId_userId: { defenseId, userId: session.user.id } }
    });

    if (!juryMember) return NextResponse.json({ error: "Not a jury member for this defense" }, { status: 403 });

    const individualFinal = computeIndividualGrade(reportScore, technicalScore, oralScore);

    // 2. Upsert evaluation
    const evaluation = await prisma.evaluation.upsert({
      where: { defenseId_evaluatorId: { defenseId, evaluatorId: session.user.id } },
      update: {
        reportScore,
        technicalScore,
        oralScore,
        finalGrade: individualFinal,
        feedback,
        submittedAt: new Date(),
      },
      create: {
        defenseId,
        evaluatorId: session.user.id,
        reportScore,
        technicalScore,
        oralScore,
        finalGrade: individualFinal,
        feedback,
        isAdvisory: juryMember.isAdvisory,
      }
    });

    // 3. Check if all required evaluations are in
    const jury = await prisma.juryMember.findMany({
      where: { defenseId, isAdvisory: false }
    });

    const evaluations = await prisma.evaluation.findMany({
      where: { defenseId, isAdvisory: false }
    });

    if (evaluations.length === jury.length) {
      // All grades in, compute final
      const grades = evaluations.map(e => e.finalGrade as number);
      const average = computeFinalGrade(grades);
      const mention = computeMention(average);

      await prisma.defense.update({
        where: { id: defenseId },
        data: {
          finalGrade: average,
          mention,
          gradesFinalized: true,
          status: "HELD",
        }
      });

      // Update internship status to COMPLETED
      const defense = await prisma.defense.findUnique({ where: { id: defenseId } });
      if (defense) {
        await prisma.internship.update({
          where: { id: defense.internshipId },
          data: { status: "COMPLETED" }
        });
      }
    }

    await AuditService.log({
      userId: session.user.id,
      action: "EVALUATION_SUBMITTED",
      targetType: "Evaluation",
      targetId: evaluation.id,
      details: { final: individualFinal }
    });

    return NextResponse.json({ data: evaluation }, { status: 201 });
  } catch (error) {
    console.error("Evaluation failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
