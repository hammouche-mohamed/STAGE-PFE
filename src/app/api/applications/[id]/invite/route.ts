import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { BinomeService } from '@/lib/services/binome.service';
import { z } from 'zod';

const inviteSchema = z.object({
  receiverId: z.string().min(1, 'Receiver ID is required'),
  message: z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Only students can send binôme invitations' }, { status: 403 });
  }

  try {
    const { id: applicationId } = await params;
    const body = await req.json();
    const { receiverId, message } = inviteSchema.parse(body);

    const invitation = await BinomeService.sendInvitation(
      applicationId,
      session.user.id,
      receiverId,
      message,
    );

    return NextResponse.json(
      { message: 'Invitation sent. Your partner has 48 hours to respond.', data: invitation },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
