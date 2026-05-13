import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session || session.user.role !== "COMPANY") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const { status } = await req.json();

    if (!["ACCEPTED", "REJECTED"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const application = await prisma.studentApplication.findUnique({
      where: { id },
      include: { 
        topic: true,
        team: {
          include: {
            members: {
              where: { isLeader: true },
              include: { student: true }
            }
          }
        }
      }
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    if (application.topic.proposedById !== session.user.id) {
      return NextResponse.json({ error: "Forbidden. You can only validate applications for your own topics." }, { status: 403 });
    }

    const updatedApplication = await prisma.studentApplication.update({
      where: { id },
      data: { status, reviewedAt: new Date() }
    });

    const leader = application.team.members[0]?.student;
    if (leader) {
      await NotificationService.trigger({
        userId: leader.id,
        type: "APPLICATION_STATUS_UPDATE",
        title: "Company Review Update",
        message: `Your application for "${application.topic.title}" was ${status.toLowerCase()} by the company.`,
        relatedId: application.topicId,
        relatedType: "Topic",
        link: "/student/topics",
      });
    }

    // If accepted, notify the super admins or department admins
    if (status === "ACCEPTED" && application.topic.filiereId) {
      const deptAdmins = await prisma.user.findMany({
        where: {
          role: "ADMIN",
          OR: [
            { adminprofile: { filiereId: application.topic.filiereId } },
            { adminprofile: { isSuperAdmin: true } }
          ]
        }
      });
      for (const admin of deptAdmins) {
         await NotificationService.trigger({
          userId: admin.id,
          type: "APPLICATION_STATUS_UPDATE",
          title: "Company Validation Complete",
          message: `The company has accepted a team for "${application.topic.title}". Please review and create the internship.`,
          relatedId: application.topicId,
          relatedType: "Topic",
          link: `/admin/topics/${application.topicId}`,
        });
      }
    }

    return NextResponse.json({ data: updatedApplication, message: `Application marked as ${status}` });
  } catch (error) {
    console.error("[applications PATCH]", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
