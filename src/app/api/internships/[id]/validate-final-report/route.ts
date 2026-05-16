import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { role, id: actorId } = session.user;

  if (!['TEACHER', 'COMPANY'].includes(role)) {
    return NextResponse.json(
      { error: 'Only teachers and company supervisors can validate the final report.' },
      { status: 403 },
    );
  }

  try {
    const { id: internshipId } = await params;

    if (role === 'TEACHER') {
      await InternshipService.teacherValidateFinalReport(internshipId, actorId);
      return NextResponse.json({
        message:
          'You have validated the final report. The student has been notified. The internship will advance to admin review once the company also validates.',
      });
    }

    await InternshipService.companyValidateFinalReport(internshipId, actorId);
    return NextResponse.json({
      message:
        'You have validated the final report. The student has been notified. The internship will advance to admin review once the teacher also validates.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
