import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import InternshipDetailClient from "./InternshipDetailClient";


export default async function TeacherInternshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    notFound();
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  try {
    const decodedId = decodeURIComponent(id);
    const normalizeSlug = (value: string) => {
      if (!value) return "";
      return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
    };

    const normalizedSlug = normalizeSlug(decodedId);

    const internshipsRaw = await prisma.internship.findMany({
      include: {
        topic: { select: { title: true, type: true, description: true } },
        user: { select: { name: true, email: true } },
        internshipstudent: { include: { user: { select: { name: true, email: true } } } },
        _count: { select: { document: true, message: true } },
      },
    });

    const internships = internshipsRaw.map((internship) => ({
      ...internship,
      teacher: internship.user || { name: 'Unknown', email: '' },
      students: (internship.internshipstudent || []).map(s => ({
        ...s,
        student: s.user || { name: 'Unknown', email: '' }
      })),
      _count: {
        documents: internship._count?.document ?? 0,
        messages: internship._count?.message ?? 0
      }
    }));

    const internship = internships.find((internship) => {
      const titleSlug = normalizeSlug(internship.topic?.title || "");
      return internship.id === decodedId || titleSlug === normalizedSlug;
    });

    if (!internship) {
      notFound();
    }


  return (
    <InternshipDetailClient
      segment={id}
      data={{
        id: internship.id,
        status: internship.status,
        academicYear: internship.academicYear,
        createdAt: new Date(internship.createdAt).toISOString(),
        midtermDeadline: internship.midtermDeadline
          ? new Date(internship.midtermDeadline).toISOString()
          : null,
        finalDeadline: internship.finalDeadline
          ? new Date(internship.finalDeadline).toISOString()
          : null,
        topic: {
          title: internship.topic.title,
          type: internship.topic.type,
          description: internship.topic.description ?? null,
        },
        teacher: {
          name: internship.teacher.name,
          email: internship.teacher.email,
        },
        students: internship.students.map((s) => ({
          name: s.student.name,
          email: s.student.email,
        })),
        counts: {
          documents: internship._count.documents,
          messages: internship._count.messages,
        },
      }}
    />
  );
  } catch (error: any) {
    console.error("PAGE RENDER ERROR:", error);
    return (
      <div className="p-8 text-center text-red-500">
        <h2 className="text-xl font-bold mb-4">Error loading internship details</h2>
        <p className="bg-red-50 p-4 rounded text-left text-sm whitespace-pre-wrap">
          {error?.message || "Unknown error occurred"}
          {'\n\n'}
          {error?.stack}
        </p>
      </div>
    );
  }
}
