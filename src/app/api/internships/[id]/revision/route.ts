import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';
import { z } from 'zod';

const revisionSchema = z.object({
  comment: z.string().min(10, 'Please provide a meaningful revision comment (min 10 characters)'),
});

// POST /api/internships/[id]/revision
// Admin or teacher requests document revision → status becomes NEEDS_REVISION
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admin or teacher can request revision
  if (!['ADMIN', 'TEACHER'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Dept Admin Scoping Check
    if (session.user.role === 'ADMIN' && !session.user.isSuperAdmin && session.user.filiereId) {
      const internship = await prisma.internship.findUnique({
        where: { id },
        include: { topic: { select: { filiereId: true } } }
      });
      if (internship && internship.topic.filiereId && internship.topic.filiereId !== session.user.filiereId) {
        return NextResponse.json({ error: "Forbidden: Internship belongs to another department" }, { status: 403 });
      }
    }
    const body = await req.json();
    const { comment } = revisionSchema.parse(body);

    await InternshipService.requestRevision(id, session.user.id, comment);

    return NextResponse.json({
      message: 'Revision requested. The student has been notified.',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
