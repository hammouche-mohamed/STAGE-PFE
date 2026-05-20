import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { InternshipService } from '@/lib/services/internship.service';
import { SettingsService } from '@/lib/services/settings.service';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const normalActivationSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  technicalSupervisorName: z.string().min(2),
  technicalSupervisorEmail: z.string().email(),
});


const pfeActivationSchema = z.object({
  startDate: z.string().datetime(),
  technicalSupervisorName: z.string().min(2),
  technicalSupervisorEmail: z.string().email(),
});


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!['COMPANY', 'ADMIN'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Only the company or admin can confirm internship dates' }, { status: 403 });
  }

  try {
    const { id } = await params;

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
    let finalDeadlineOverride: Date | null = null;

    if (isPFE) {
      // PFE internships use the system-wide end date / final report deadline
      // set by the super admin in /admin/settings. Both fields are locked to
      // that single date so every PFE cohort ends on the same day.
      const pfeEndDate = await SettingsService.getPfeEndDate();
      if (!pfeEndDate) {
        return NextResponse.json({
          error: 'The super administrator has not set the PFE end date yet. Configure it in Admin Settings before activating a PFE internship.',
        }, { status: 400 });
      }
      const parsed = pfeActivationSchema.parse(body);
      startDate = new Date(parsed.startDate);
      endDate = pfeEndDate;
      finalDeadlineOverride = pfeEndDate;
      technicalSupervisorName = parsed.technicalSupervisorName;
      technicalSupervisorEmail = parsed.technicalSupervisorEmail;
    } else {
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
      finalDeadlineOverride,
    );

    return NextResponse.json({
      message: isPFE
        ? 'PFE internship activated. End date and final report deadline are locked to the system-wide PFE date.'
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

