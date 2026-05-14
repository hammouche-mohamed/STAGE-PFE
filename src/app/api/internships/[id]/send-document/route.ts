import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
    await InternshipService.sendDocument(id, session.user.id);

    return NextResponse.json({ message: 'Convention marked as sent to company.' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
