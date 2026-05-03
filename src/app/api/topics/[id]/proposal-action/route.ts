import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { StudentProposalService } from '@/lib/services/studentProposal.service';
import { z } from 'zod';

const actionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  teacherId: z.string().optional(), // Required when action === 'APPROVE'
  comment: z.string().optional(),   // Required when action === 'REJECT'
});

// PATCH /api/topics/[id]/proposal-action
// Admin approves or rejects a student-submitted (PATH B) proposal
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { action, teacherId, comment } = actionSchema.parse(body);

    if (action === 'APPROVE') {
      if (!teacherId) {
        return NextResponse.json(
          { error: 'teacherId is required to approve a proposal' },
          { status: 400 },
        );
      }

      await StudentProposalService.approveProposal(id, session.user.id, teacherId);

      return NextResponse.json({
        message: 'Proposal approved. Internship created and student assigned.',
      });
    } else {
      if (!comment) {
        return NextResponse.json(
          { error: 'A rejection comment is required' },
          { status: 400 },
        );
      }

      await StudentProposalService.rejectProposal(id, session.user.id, comment);

      return NextResponse.json({ message: 'Proposal rejected. Student has been notified.' });
    }
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('capacity') ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
