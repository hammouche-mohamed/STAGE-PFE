import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/binome-invitations
// Returns all binôme invitations for the currently logged-in student
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const invitations = await prisma.binomeInvitation.findMany({
      where: { invitedStudentId: session.user.id },
      include: {
        application: {
          include: {
            topic: { select: { title: true, internshipType: true } },
            leader: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ data: invitations });
  } catch (error) {
    console.error('[binome-invitations GET]', error);
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}
