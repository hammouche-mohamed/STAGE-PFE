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

  const [
    internshipCount,
    pendingApplications,
    pendingDocuments,
    pendingFinalReports,
    activeInternships,
    recentMessages,
    companyTopicCount
  ] = await Promise.all([
    prisma.internship.count({ where: { teacherId: teacher.id, status: "IN_PROGRESS" } }),
    prisma.teacherApplication.count({ where: { teacherId: teacher.id, status: "PENDING" } }),
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
        where: { internship: { teacherId: teacher.id } },
        include: {
          user: { select: { name: true } },
          internship: { select: { topic: { select: { title: true } } } }
        } as any,
        take: 4,
        orderBy: { sentAt: "desc" }
      }),
    prisma.topic.count({
      where: {
        type: "COMPANY_PROPOSED",
        assignedTeacherId: null,
        // Only topics a teacher can actually pick up …
        status: { in: ["APPROVED", "OPEN_FOR_SELECTION"] },
        // … and only in this teacher's own department.
        filiereId: teacher.teacherprofile?.filiereId ?? "__no_department__",
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
        userName: m.user?.name ?? "",
        topicTitle: m.internship?.topic?.title ?? "",
        sentAt: new Date(m.sentAt).toISOString(),
        content: m.content ?? "",
      }))}
    />
  );
}
