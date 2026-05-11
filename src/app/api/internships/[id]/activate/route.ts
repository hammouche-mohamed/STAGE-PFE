import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// NORMAL internships: company sets start+end dates
const normalActivationSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  technicalSupervisorName: z.string().min(2),
  technicalSupervisorEmail: z.string().email(),
});

// PFE internships: company only sets start date; end date comes from admin's final deadline
const pfeActivationSchema = z.object({
  startDate: z.string().datetime(),
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

    // Check internship type first
    const internship = await prisma.internship.findUnique({
      where: { id },
      select: { internshipType: true, finalDeadline: true },
    });

    if (!internship) return NextResponse.json({ error: 'Internship not found' }, { status: 404 });

    const isPFE = internship.internshipType === 'PFE';
    const body = await req.json();

    let startDate: Date;
    let endDate: Date;
    let technicalSupervisorName: string;
    let technicalSupervisorEmail: string;

    if (isPFE) {
      // PFE: end date is driven by admin's final deadline
      if (!internship.finalDeadline) {
        return NextResponse.json({
          error: 'The administration must set the final report deadline before the company can activate a PFE internship.',
        }, { status: 400 });
      }
      const parsed = pfeActivationSchema.parse(body);
      startDate = new Date(parsed.startDate);
      endDate = internship.finalDeadline; // locked to admin deadline
      technicalSupervisorName = parsed.technicalSupervisorName;
      technicalSupervisorEmail = parsed.technicalSupervisorEmail;
    } else {
      // NORMAL: company provides both start and end
      const parsed = normalActivationSchema.parse(body);
      startDate = new Date(parsed.startDate);
      endDate = new Date(parsed.endDate);
      technicalSupervisorName = parsed.technicalSupervisorName;
      technicalSupervisorEmail = parsed.technicalSupervisorEmail;
    }

    if (endDate <= startDate) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    await InternshipService.activateInternship(
      id,
      startDate,
      endDate,
      technicalSupervisorName,
      technicalSupervisorEmail,
      session.user.id,
    );

    return NextResponse.json({
      message: isPFE
        ? 'PFE internship activated. End date is locked to the admin-set final report deadline.'
        : 'Internship activated. Deadlines have been calculated.',
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

