import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';

// POST /api/internships/[id]/complete
// Admin confirms the final report after BOTH teacher and company have validated.
// Status must be PENDING_ADMIN_CONFIRMATION — service enforces this guard.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only administrators can confirm internship completion.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;

    // Dept Admin Scoping Check
    if (!session.user.isSuperAdmin && session.user.filiereId) {
      const internship = await prisma.internship.findUnique({
        where: { id },
        include: { topic: { select: { filiereId: true } } }
      });
      if (internship && internship.topic.filiereId && internship.topic.filiereId !== session.user.filiereId) {
        return NextResponse.json({ error: "Forbidden: Internship belongs to another department" }, { status: 403 });
      }
    }
    await InternshipService.completeInternship(id, session.user.id);

    return NextResponse.json({
      message:
        'Internship confirmed as completed. All parties have been notified and the record has been archived.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
