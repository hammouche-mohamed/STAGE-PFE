import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, MapPin, FileText, MessageSquare, GraduationCap, Briefcase, Calendar } from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { format } from "date-fns";


export default async function TeacherInternshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) {
    notFound();
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  const decodedId = decodeURIComponent(id);
  const normalizeSlug = (value: string) =>
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

  const normalizedSlug = normalizeSlug(decodedId);

  const internships = await prisma.internship.findMany({
    include: {
      topic: { select: { title: true, type: true, description: true } },
      teacher: { select: { name: true, email: true } },
      students: { include: { student: { select: { name: true, email: true } } } },
      _count: { select: { documents: true, messages: true } },
    },
  });

  const internship = internships.find((internship) => {
    const titleSlug = normalizeSlug(internship.topic.title);
    return internship.id === decodedId || titleSlug === normalizedSlug;
  });

  if (!internship) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Link
            href="/teacher/internships"
            className="inline-flex items-center gap-2 text-[13px] text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to internships
          </Link>
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <StatusBadge status={internship.status} />
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{internship.topic.type}</span>
            </div>
            <h1 className="text-[24px] font-bold text-gray-900">{internship.topic.title}</h1>
            <p className="text-[13px] text-gray-500 mt-1">Academic year {internship.academicYear}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="bg-white border border-gray-200 rounded-md p-4 text-center">
            <Briefcase className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400 uppercase tracking-widest">Documents</p>
            <p className="text-[18px] font-semibold text-gray-900">{internship._count.documents}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-4 text-center">
            <MessageSquare className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400 uppercase tracking-widest">Messages</p>
            <p className="text-[18px] font-semibold text-gray-900">{internship._count.messages}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-md p-4 text-center">
            <Calendar className="h-5 w-5 text-indigo-600 mx-auto mb-2" />
            <p className="text-[12px] text-gray-400 uppercase tracking-widest">Created</p>
            <p className="text-[18px] font-semibold text-gray-900">{format(new Date(internship.createdAt), "MMM d, yyyy")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Project Description</h2>
            <p className="text-[14px] text-gray-600 leading-relaxed">
              {internship.topic.description || "No description provided for this project."}
            </p>
          </section>

          <section className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
            <h2 className="text-[15px] font-semibold text-gray-900 mb-4">Participants</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="text-[12px] text-gray-400 uppercase tracking-widest">Supervisor</p>
                <div className="rounded-md border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">{internship.teacher.name.charAt(0)}</div>
                    <div>
                      <p className="text-[14px] font-semibold text-gray-900">{internship.teacher.name}</p>
                      <p className="text-[12px] text-gray-500">{internship.teacher.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[12px] text-gray-400 uppercase tracking-widest">Students</p>
                <div className="rounded-md border border-gray-100 bg-gray-50 p-4 space-y-3">
                  {internship.students.map((student) => (
                    <div key={student.student.email} className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">{student.student.name.charAt(0)}</div>
                      <div>
                        <p className="text-[14px] font-semibold text-gray-900">{student.student.name}</p>
                        <p className="text-[12px] text-gray-500">{student.student.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {(internship.midtermDeadline || internship.finalDeadline) && (
            <section className="bg-white border border-gray-200 rounded-md p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <h2 className="text-[15px] font-semibold text-gray-900">Key Deadlines</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {internship.midtermDeadline && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-4">
                    <p className="text-[11px] font-bold text-amber-700 uppercase tracking-widest">Midterm Report</p>
                    <p className="text-[14px] font-semibold text-gray-900 mt-1">
                      {format(new Date(internship.midtermDeadline), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
                {internship.finalDeadline && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                    <p className="text-[11px] font-bold text-indigo-700 uppercase tracking-widest">Final Report</p>
                    <p className="text-[14px] font-semibold text-gray-900 mt-1">
                      {format(new Date(internship.finalDeadline), "MMMM d, yyyy")}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-[12px] text-gray-400 uppercase tracking-widest">Topic type</p>
                <p className="text-[14px] font-semibold text-gray-900">{internship.topic.type}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-indigo-600" />
              <div>
                <p className="text-[12px] text-gray-400 uppercase tracking-widest">Room / location</p>
                <p className="text-[14px] font-semibold text-gray-900">TBD</p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-md p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[12px] text-gray-400 uppercase tracking-widest">Quick actions</p>
            </div>
            <div className="space-y-3">
              <Link href="/teacher/documents" className="block rounded-md border border-gray-200 bg-white px-4 py-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                View documents
              </Link>
              <Link href="/teacher/messages" className="block rounded-md border border-gray-200 bg-white px-4 py-3 text-[13px] font-medium text-gray-700 hover:bg-gray-50">
                Open messages
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
