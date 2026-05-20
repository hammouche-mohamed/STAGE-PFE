import prisma from "@/lib/prisma";
import { auth } from "@/lib/auth";
import TeacherDashboardClient from "./TeacherDashboardClient";

export default async function TeacherDashboardPage() {
  // NFR-M3 / NFR-S2: use the authenticated session — never hardcode user IDs or emails
  const session = await auth();
  if (!session?.user?.id) return <div className="p-8 text-gray-400">Session not found.</div>;

  const teacher = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      teacherprofile: { select: { maxStudents: true, currentLoad: true, filiereId: true } },
    } as any,
  }) as any;

  if (!teacher) return <div className="p-8 text-gray-400">Teacher profile not found.</div>;

  const teacherFiliereId = teacher.teacherprofile?.filiereId ?? null;

  const [
    internshipCount,
    pendingApplications,
    pendingDocuments,
    pendingFinalReports,
    activeInternships,
    recentMessages,
    companyTopicCount
  ] = await Promise.all([
    // "Supervisions" = every topic the teacher is currently responsible for —
    // not just IN_PROGRESS. Counts both topics they've confirmed (OPEN, TAKEN
    // with internship not finished) and topics still awaiting their response
    // (PENDING_TEACHER). The card subtitle already says "max capacity".
    prisma.topic.count({
      where: {
        assignedTeacherId: teacher.id,
        archivedAt: null,
      },
    }),
    // "Applications / Topic requests" = both the teacher's self-applications
    // still pending admin review AND the topics where the admin invited THEM
    // and is waiting for their accept/decline (PENDING_TEACHER assigned to
    // them). Previously this missed every admin-initiated invitation.
    (async () => {
      const [selfApplied, invited] = await Promise.all([
        prisma.teacherApplication.count({
          where: { teacherId: teacher.id, status: "PENDING" },
        }),
        prisma.topic.count({
          where: {
            assignedTeacherId: teacher.id,
            status: "PENDING_TEACHER",
            archivedAt: null,
          },
        }),
      ]);
      return selfApplied + invited;
    })(),
    prisma.document.count({
      where: {
        internship: { teacherId: teacher.id },
        status: "UPLOADED",
      },
    }),
    prisma.internship.count({
      where: {
        teacherId: teacher.id,
        status: "FINAL_REPORT_SUBMITTED",
        teacherValidatedFinalReport: false,
      },
    }),
      prisma.internship.findMany({
        where: { teacherId: teacher.id, status: "IN_PROGRESS" },
        include: {
          topic: { select: { title: true } },
          internshipstudent: { include: { user: { select: { name: true } } } },
        } as any,
        take: 5,
        orderBy: { updatedAt: "desc" }
      }),
      prisma.message.findMany({
        where: {
          internship: {
            teacherId: teacher.id,
            // Only conversations the teacher can actually open in chat:
            // not finished, not cancelled, not archived. Keeps Recent
            // Activity consistent with the chat thread list.
            status: { notIn: ["COMPLETED", "CANCELLED", "REQUESTED"] },
            archivedAt: null,
          },
        } as any,
        include: {
          user: { select: { name: true } },
          internship: { select: { id: true, topic: { select: { title: true } } } }
        } as any,
        take: 4,
        orderBy: { sentAt: "desc" }
      }),
    // Open company topics the teacher could pick up. Department scoping is
    // applied ONLY when the teacher has a filière — otherwise the previous
    // '__no_department__' fallback matched zero forever and gave the
    // misleading "0 — None awaiting a supervisor" card.
    prisma.topic.count({
      where: {
        type: "COMPANY_PROPOSED",
        assignedTeacherId: null,
        status: { in: ["APPROVED", "OPEN_FOR_SELECTION"] },
        archivedAt: null,
        ...(teacherFiliereId ? { filiereId: teacherFiliereId } : {}),
      }
    })
  ]);

  return (
    <TeacherDashboardClient
      teacherName={teacher.name}
      maxStudents={teacher.teacherprofile?.maxStudents ?? 5}
      internshipCount={internshipCount}
      pendingApplications={pendingApplications}
      pendingDocuments={pendingDocuments}
      pendingFinalReports={pendingFinalReports}
      companyTopicCount={companyTopicCount}
      activeInternships={activeInternships.map((i: any) => ({
        id: i.id,
        title: i.topic?.title ?? "",
        students: (i.internshipstudent ?? []).map((s: any) => s.user?.name).filter(Boolean),
      }))}
      recentMessages={recentMessages.map((m: any) => ({
        id: m.id,
        internshipId: m.internship?.id ?? "",
        userName: m.user?.name ?? "",
        topicTitle: m.internship?.topic?.title ?? "",
        sentAt: new Date(m.sentAt).toISOString(),
        content: m.content ?? "",
      }))}
    />
  );
}
