import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SettingsService } from '@/lib/services/settings.service';

// TEMP DEBUG ENDPOINT - remove after diagnosis
export async function GET(req: NextRequest) {
  const results: Record<string, any> = {};

  // Step 1: Settings
  try {
    const year = await SettingsService.getCurrentAcademicYear();
    results.academicYear = year;
  } catch (e: any) {
    results.academicYearError = e.message;
  }

  // Step 2: Simple count
  try {
    results.topicCount = await prisma.topic.count();
  } catch (e: any) {
    results.topicCountError = e.message;
  }

  // Step 3: Count with year filter
  try {
    results.topicCountFiltered = await prisma.topic.count({
      where: { academicYear: results.academicYear }
    });
  } catch (e: any) {
    results.topicCountFilteredError = e.message;
  }

  // Step 4: Full findMany with relations (same as Topics API)
  try {
    const topics = await prisma.topic.findMany({
      where: { academicYear: results.academicYear },
      select: {
        id: true,
        title: true,
        status: true,
        academicYear: true,
        type: true,
        internshipType: true,
        maxStudents: true,
        proposedById: true,
        assignedTeacherId: true,
        resubmissionCount: true,
        maxResubmissions: true,
        rejectionReason: true,
        createdAt: true,
        updatedAt: true,
        pendingEditData: true,
        pendingEditRequestedAt: true,
        proposedBy: { select: { id: true, name: true } },
        assignedTeacher: { select: { id: true, name: true } },
      } as any,
      orderBy: { createdAt: 'desc' },
      take: 3,
    });
    results.topicsFound = topics.length;
    results.firstTopic = topics[0] ? {
      id: topics[0].id,
      title: topics[0].title,
      status: topics[0].status,
      hasProposedBy: !!(topics[0] as any).proposedBy,
      proposedByName: (topics[0] as any).proposedBy?.name,
    } : null;
  } catch (e: any) {
    results.topicsFindManyError = e.message;
    results.topicsFindManyStack = e.stack?.split('\n').slice(0, 5).join(' | ');
  }

  // Step 5: CompletedTopicIds
  try {
    const completed = await prisma.internship.findMany({
      where: { status: { in: ['COMPLETED', 'CANCELLED'] } },
      select: { topicId: true }
    });
    results.completedTopicIds = completed.length;
  } catch (e: any) {
    results.completedTopicIdsError = e.message;
  }

  return NextResponse.json(results);
}
