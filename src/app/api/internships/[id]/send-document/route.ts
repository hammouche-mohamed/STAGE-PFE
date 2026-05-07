import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';

// POST /api/internships/[id]/send-document
// Admin marks the convention as sent to the company
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only admin can mark document as sent
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    await InternshipService.sendDocument(id, session.user.id);

    return NextResponse.json({ message: 'Convention marked as sent to company.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
