import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';

// POST /api/internships/[id]/complete
// Admin approves the final report → internship becomes COMPLETED
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Admin is the sole authority for final approval
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only admin can mark an internship as completed' },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    await InternshipService.completeInternship(id, session.user.id);

    return NextResponse.json({
      message: 'Internship completed successfully. All parties have been notified.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
