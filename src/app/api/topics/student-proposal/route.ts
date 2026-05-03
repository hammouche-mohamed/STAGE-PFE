import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { StudentProposalService } from '@/lib/services/studentProposal.service';
import { z } from 'zod';
import type { StudentLevel, InternshipType } from '@/types/internship';

const studentProposalSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  requiredSkills: z.string().optional(),
  internshipType: z.enum(['PFE', 'NORMAL']),
  companyName: z.string().min(2, 'Company name is required'),
  companySector: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  contactEmail: z.string().email('Invalid contact email'),
  contactPhone: z.string().optional(),
  supportingDocUrl: z.string().url().optional(),
});

// POST /api/topics/student-proposal
// Students submit PATH B proposals (topic + company info)
export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only students can submit proposals via this route
  if (session.user.role !== 'STUDENT') {
    return NextResponse.json(
      { error: 'Only students can submit topic proposals via this route' },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const data = studentProposalSchema.parse(body);

    const topic = await StudentProposalService.submitProposal(
      session.user.id,
      (session.user as any).level as StudentLevel | undefined,
      data,
    );

    return NextResponse.json(
      { message: 'Proposal submitted successfully. Awaiting admin review.', data: topic },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
