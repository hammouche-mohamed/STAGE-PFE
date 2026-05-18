import { NextRequest, NextResponse, after } from "next/server";
import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { NotificationService } from "@/lib/services/notification.service";
import { AuditService } from "@/lib/services/audit.service";

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
        studentteam: {
          include: {
            teammember: {
              where: { isLeader: true },
              include: { user: true }
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

    // Only one team can win a topic. When the company ACCEPTS an application,
    // every other still-open application for the same topic is auto-rejected
    // so a second team can't also be accepted later.
    let autoRejected: Array<{
      leaderId: string;
      teamId: string | null;
      topicTitle: string;
    }> = [];

    const updatedApplication = await prisma.$transaction(async (tx) => {
      const updated = await tx.studentApplication.update({
        where: { id },
        data: { status, reviewedAt: new Date() },
      });

      if (status === "ACCEPTED") {
        const losers = await tx.studentApplication.findMany({
          where: {
            topicId: application.topicId,
            id: { not: id },
            status: { notIn: ["REJECTED", "CANCELLED"] },
          },
          select: { leaderId: true, teamId: true },
        });

        if (losers.length > 0) {
          await tx.studentApplication.updateMany({
            where: {
              topicId: application.topicId,
              id: { not: id },
              status: { notIn: ["REJECTED", "CANCELLED"] },
            },
            data: { status: "REJECTED", reviewedAt: new Date() },
          });
          autoRejected = losers.map((l) => ({
            leaderId: l.leaderId,
            teamId: l.teamId,
            topicTitle: application.topic.title,
          }));
        }
      }

      return updated;
    });

    // Notifications + audit involve SMTP email delivery, which is slow. Run
    // them AFTER the response is flushed so the company UI gets an immediate
    // reply. The in-app notification rows are still persisted; if the email
    // step fails the daily cron (retryFailedEmails) re-attempts delivery.
    const leader = application.studentteam?.teammember[0]?.user;
    after(async () => {
      try {
        if (leader) {
          await NotificationService.trigger({
            userId: leader.id,
            // "APPLICATION_STATUS_UPDATE" is NOT a valid notification_type
            // enum value — prisma.notification.create threw on it and the
            // error was swallowed, so neither the in-app row nor the email
            // was ever delivered. Use the real enum value.
            type: status === "ACCEPTED" ? "APPLICATION_APPROVED" : "APPLICATION_REJECTED",
            title: "Company Review Update",
            message: `Your application for "${application.topic.title}" was ${status.toLowerCase()} by the company.`,
            relatedId: application.topicId,
            relatedType: "Topic",
            link: "/student/topics",
          });
        }

        if (status === "ACCEPTED" && application.topic.filiereId) {
          const deptAdmins = await prisma.user.findMany({
            where: {
              role: "ADMIN",
              OR: [
                { adminprofile: { filiereId: application.topic.filiereId } },
                { adminprofile: { isSuperAdmin: true } }
              ]
            }
          } as any);
          await Promise.all(
            deptAdmins.map((admin: { id: string }) =>
              NotificationService.trigger({
                userId: admin.id,
                type: "APPLICATION_APPROVED",
                title: "Company Validation Complete",
                message: `The company has accepted a team for "${application.topic.title}". Please review and create the internship.`,
                relatedId: application.topicId,
                relatedType: "Topic",
                link: `/admin/topics/${application.topicId}`,
              })
            )
          );
        }

        // Tell every team that lost the topic why their application closed.
        await Promise.all(
          autoRejected.map((r) =>
            NotificationService.trigger({
              userId: r.leaderId,
              type: "APPLICATION_REJECTED",
              title: "Application Not Accepted",
              message: `Your application for "${r.topicTitle}" was not accepted — another team was selected for this topic.`,
              relatedId: application.topicId,
              relatedType: "Topic",
              link: "/student/topics",
            })
          )
        );

        await AuditService.log({
          userId: session.user.id,
          action: status === "ACCEPTED" ? "APPLICATION_ACCEPTED" : "APPLICATION_REJECTED",
          targetType: "StudentApplication",
          targetId: id,
          details: { topicId: application.topicId, topicTitle: application.topic.title },
        });
      } catch (err) {
        console.error("[applications PATCH:after]", err);
      }
    });

    return NextResponse.json({ data: updatedApplication, message: `Application marked as ${status}` });
  } catch (error) {
    console.error("[applications PATCH]", error);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
