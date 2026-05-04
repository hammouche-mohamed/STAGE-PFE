import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';

// POST /api/internships/[id]/submit-final-report
// Student submits their final report → status becomes FINAL_REPORT_SUBMITTED
// This signals to both the teacher and the company that validation is required.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'STUDENT') {
    return NextResponse.json(
      { error: 'Only students can submit the final report.' },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    await InternshipService.submitFinalReport(id, session.user.id);

    return NextResponse.json({
      message:
        'Final report submitted successfully. Your supervisor and company have been notified for validation.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
