import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BinomeService } from '@/lib/services/binome.service';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const respondSchema = z.object({
  accept: z.boolean(),
});

// GET /api/binome-invitations/[id]  — fetch invitation details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const invitation = await prisma.binomeInvitation.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            topic: { select: { title: true, internshipType: true } },
            leader: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!invitation) return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });

    // Only the invited student or admin can see the invitation
    if (
      session.user.role !== 'ADMIN' &&
      invitation.invitedStudentId !== session.user.id
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ data: invitation });
  } catch {
    return NextResponse.json({ error: 'Fetch failed' }, { status: 500 });
  }
}

// PATCH /api/binome-invitations/[id]  — accept or decline
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can respond to invitations' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { accept } = respondSchema.parse(body);

    await BinomeService.respondToInvitation(id, session.user.id, accept);

    return NextResponse.json({
      message: accept ? 'Invitation accepted. Application is now active.' : 'Invitation declined.',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
