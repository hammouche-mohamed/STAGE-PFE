import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { AuditService } from '@/lib/services/audit.service';
import { NotificationService } from '@/lib/services/notification.service';
import { z } from 'zod';

const reviewSchema = z.object({
  approved: z.boolean(),
  comment: z.string().max(1000).optional(),
});

// PATCH /api/documents/[id]/company-review
// Company marks the student's final report as reviewed (advisory — admin has final say)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'COMPANY') {
    return NextResponse.json({ error: 'Only the company can submit a company review' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const { approved, comment } = reviewSchema.parse(body);

    const document = await prisma.document.findUnique({
      where: { id },
      include: {
        internship: {
          include: {
            topic: { select: { proposedById: true } },
            students: { select: { studentId: true } },
          },
        },
      },
    });

    if (!document) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    // Verify this company owns the internship's topic
    if (document.internship.topic.proposedById !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden — not your internship' }, { status: 403 });
    }

    // Only FINAL_REPORT documents can be reviewed by the company
    if (document.type !== 'FINAL_REPORT') {
      return NextResponse.json(
        { error: 'Company review is only available for the final report' },
        { status: 400 },
      );
    }

    const updated = await prisma.document.update({
      where: { id },
      data: {
        approvedByCompany: approved,
        reviewedByCompany: session.user.id,
        companyComment: comment,
      },
    });

    await AuditService.log({
      userId: session.user.id,
      action: 'COMPANY_REPORT_REVIEWED',
      targetType: 'Document',
      targetId: document.fileName,
      details: { approved, comment },
    });

    // Notify the admin that the company has reviewed the document
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    });

    for (const admin of admins) {
      await NotificationService.trigger({
        userId: admin.id,
        type: 'DOCUMENT_UPLOADED',
        title: 'Company Reviewed Final Report',
        message: `The company has marked the final report as ${approved ? 'approved' : 'noted with concerns'}. ${comment ? `Comment: ${comment}` : ''}`,
        relatedId: document.internshipId,
        relatedType: 'Internship',
        link: '/admin/internships',
      });
    }

    return NextResponse.json({ data: updated });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
