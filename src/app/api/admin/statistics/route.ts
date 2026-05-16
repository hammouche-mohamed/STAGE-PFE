import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SettingsService } from '@/lib/services/settings.service';
import { differenceInDays } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const defaultYear = await SettingsService.getCurrentAcademicYear();
  const academicYear = searchParams.get('academicYear') || defaultYear;
  const internshipTypeFilter = searchParams.get('type') as 'PFE' | 'NORMAL' | null;

  try {
    const baseWhere: Record<string, unknown> = { academicYear };
    if (internshipTypeFilter) baseWhere.internshipType = internshipTypeFilter;

    const [
      totalActive,
      totalCompleted,
      allInternships,
      byType,
      topCompanies,
    ] = await Promise.all([
      prisma.internship.count({
        where: { ...baseWhere, status: { in: ['IN_PROGRESS', 'REQUESTED', 'DOCUMENT_SENT'] } },
      }),
      prisma.internship.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),

      prisma.internship.findMany({
        where: { ...baseWhere, status: 'COMPLETED', completedAt: { not: null }, activatedAt: { not: null } },
        select: { activatedAt: true, completedAt: true, internshipType: true },
      }),
      prisma.internship.groupBy({
        by: ['internshipType'],
        where: { academicYear },
        _count: { _all: true },
      }),

      prisma.internship.groupBy({
        by: ['topicId'],
        where: { ...baseWhere },
        _count: { _all: true },
        orderBy: { _count: { topicId: 'desc' } },
        take: 5,
      }),
    ]);

    const completionTimes = allInternships
      .filter((i) => i.activatedAt && i.completedAt)
      .map((i) => differenceInDays(i.completedAt!, i.activatedAt!));

    const avgCompletionDays =
      completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;

    const totalInternships = totalActive + totalCompleted;
    const completionRate =
      totalInternships > 0
        ? Math.round((totalCompleted / totalInternships) * 100)
        : 0;

    const topTopicIds = topCompanies.map((t) => t.topicId);
    const topicDetails = await prisma.topic.findMany({
      where: { id: { in: topTopicIds } },
      include: {
        proposedBy: {
          include: { companyprofile: { select: { companyName: true } } },
        },
      },
    } as any);

    const topCompaniesFormatted = topicDetails.map((topic: any) => {
      const tc = topCompanies.find((t) => t.topicId === topic.id);
      const name =
        topic.companyName ||
        topic.proposedBy?.companyprofile?.companyName ||
        'Unknown Company';
      return { companyName: name, internshipCount: tc?._count._all || 0 };
    });

    return NextResponse.json({
      data: {
        academicYear,
        totalActive,
        totalCompleted,
        completionRate,
        avgCompletionDays,
        byType: byType.map((b) => ({
          type: b.internshipType ?? 'UNKNOWN',
          count: b._count._all,
        })),
        topCompanies: topCompaniesFormatted,
      },
    });
  } catch (error) {
    console.error('[statistics]', error);
    return NextResponse.json({ error: 'Statistics fetch failed' }, { status: 500 });
  }
}
