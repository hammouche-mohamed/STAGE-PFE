import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';
import { z } from 'zod';

const activationSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  technicalSupervisorName: z.string().min(2),
  technicalSupervisorEmail: z.string().email(),
});

// POST /api/internships/[id]/activate
// Company (or admin) confirms dates and starts the internship
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only company or admin can activate
  if (!['COMPANY', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Only the company or admin can confirm internship dates' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { startDate, endDate, technicalSupervisorName, technicalSupervisorEmail } = activationSchema.parse(body);

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    await InternshipService.activateInternship(
      id,
      start,
      end,
      technicalSupervisorName,
      technicalSupervisorEmail,
      session.user.id,
    );

    return NextResponse.json({ message: 'Internship activated. Deadlines have been calculated.' });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
