import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
  datasources: { db: { url: process.env.DATABASE_URL } }
});

async function main() {
  console.log('=== DATABASE URL (masked) ===');
  const url = process.env.DATABASE_URL || 'NOT SET';
  console.log(url.replace(/:([^@]+)@/, ':***@'));

  console.log('\n=== STEP 1: Check systemSettings ===');
  try {
    const settings = await prisma.systemSettings.findMany();
    console.log('Settings:', JSON.stringify(settings, null, 2));
  } catch (e: any) {
    console.error('ERROR fetching settings:', e.message);
  }

  console.log('\n=== STEP 2: Count all topics ===');
  try {
    const count = await prisma.topic.count();
    console.log('Total topics in DB:', count);
  } catch (e: any) {
    console.error('ERROR counting topics:', e.message);
  }

  console.log('\n=== STEP 3: Topics with academicYear filter (2024-2025) ===');
  try {
    const count = await prisma.topic.count({ where: { academicYear: '2024-2025' } });
    console.log('Topics with academicYear=2024-2025:', count);
  } catch (e: any) {
    console.error('ERROR:', e.message);
  }

  console.log('\n=== STEP 4: Full topics findMany (same as API, no year filter) ===');
  try {
    const topics = await prisma.topic.findMany({
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
      take: 5,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`Found ${topics.length} topics`);
    topics.forEach(t => console.log(`  - [${t.status}] "${t.title}" (year: ${t.academicYear})`));
  } catch (e: any) {
    console.error('ERROR in findMany:', e.message);
    console.error('Full error:', e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
